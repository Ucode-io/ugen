"use client";

import { Fragment, useState } from "react";
import NumberFlow from "@number-flow/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CalendarClock,
  CalendarX2,
  CheckCircle2,
  ChevronDown,
  Crown,
  Loader2,
  RotateCcw,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui";
import { cn } from "@/shared/lib/utils/cn";
import { api } from "@/shared/api";
import { useAuthStore } from "@/entities/session";
import {
  useCompanyProjectsList,
  useFare,
  useCurrentSubscription,
  useUsdRate,
  uzsToUsd,
  formatUsd,
} from "@/entities/billing";
import { TopUpModal, formatAmount } from "./top-up-modal";
import { useTranslations } from 'next-intl'

/* ── Billing periods ── */
const PERIODS = [
  {
    key: "month",
    label: "Monthly",
    save: null,
    multiplier: 1,
    per: "per user · billed monthly",
  },
  {
    key: "year",
    label: "Annual",
    save: "Save 13%",
    multiplier: 0.87,
    per: "per user · billed annually",
  },
] as const;
type Period = (typeof PERIODS)[number]["key"];

/** Months billed per period -- used to size the top-up to the full billing cycle. */
const PERIOD_MONTHS: Record<Period, number> = {
  year: 12,
  month: 1,
};

/** Backend billing-period codes sent in the AttachFare body. */
const PERIOD_CODE: Record<Period, "monthly" | "six_months" | "annual"> = {
  month: "monthly",
  year: "annual",
};

type PlanMeta = {
  key: string;
  fareName: string | null;
  desc: string;
  cta: string;
  featured: boolean;
  badge?: string;
  href?: string;
  perFreeText?: string;
};

const PLAN_META: PlanMeta[] = [
  {
    key: "free",
    fareName: "free",
    desc: "Perfect for individuals exploring the platform.",
    cta: "Get started free",
    featured: false,
    perFreeText: "per user · forever free",
  },
  {
    key: "starter",
    fareName: "basic",
    desc: "For small teams building and shipping real products.",
    cta: "Upgrade to Starter",
    featured: false,
  },
  {
    key: "pro",
    fareName: "pro",
    desc: "For growing teams with advanced scale and custom requirements.",
    cta: "Upgrade to Pro",
    featured: true,
    badge: "Popular",
  },
  {
    key: "enterprise",
    fareName: null,
    desc: "Custom scale, security, and compliance.",
    cta: "Contact sales →",
    href: "https://calendar.app.google/zUXHa2dh3N3Cv2dp6",
    featured: false,
  },
];

/* ── AttachFare error mapping ──
 * The backend returns the raw reason in the response description; map known
 * reasons to user-facing copy. Matching is a case-insensitive substring check
 * so we tolerate minor wording changes on the backend. */
const ATTACH_FARE_ERRORS: { match: string; message: string }[] = [
  {
    match: "ucode plans cannot be changed",
    message: "Plan changes are not available for this project",
  },
  {
    match: "cannot switch between ucode and ugen",
    message: "Cannot switch plan type",
  },
  {
    match: "already subscribed to this plan",
    message: "You're already on this plan",
  },
  {
    match: "balance + credit limit is less than",
    message: "Insufficient balance. Please top up.",
  },
];

const mapAttachFareError = (err: any): string => {
  const payload = err?.response?.data;
  const raw = [payload?.description, payload?.data, payload?.custom_message]
    .filter((v) => typeof v === "string")
    .join(" ")
    .toLowerCase();
  const matched = ATTACH_FARE_ERRORS.find((e) => raw.includes(e.match));
  if (matched) return matched.message;
  return typeof payload?.description === "string" && payload.description.trim()
    ? payload.description
    : "Failed to update plan";
};

/* ── Insufficient-balance detection ──
 * AttachFare rejects with "balance + credit limit is less than {amount}" when
 * the project can't cover the plan. We detect that case to route the user into
 * the top-up flow, and parse the required amount to pre-fill the suggested sum.
 * Returns the required amount, 0 when insufficient but the amount can't be
 * parsed, or null when it isn't an insufficient-balance error at all. */
const parseInsufficientBalance = (err: any): number | null => {
  const payload = err?.response?.data;
  const raw = [payload?.description, payload?.data, payload?.custom_message]
    .filter((v) => typeof v === "string")
    .join(" ")
    .toLowerCase();
  if (!raw.includes("balance + credit limit is less than")) return null;
  const match = raw.match(/less than\s*([\d\s.,]+)/);
  if (!match) return 0;
  const num = Number(match[1].replace(/[\s,]/g, ""));
  return Number.isFinite(num) ? num : 0;
};

const formatSubscriptionDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatFareValue = (value: string | undefined) => {
  if (!value || value === "-1") return "Unlimited";
  if (value === "0") return "--";
  const num = Number(value);
  if (!isNaN(num)) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }
  return value;
};

interface UpgradePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UpgradePlanDialog = ({
  open,
  onOpenChange,
}: UpgradePlanDialogProps) => {
  const t = useTranslations('widgets.sidebar')
  const [period, setPeriod] = useState<Period>("month");
  const [compareOpen, setCompareOpen] = useState(false);
  const [pendingFareId, setPendingFareId] = useState<string | null>(null);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmountUsd, setTopUpAmountUsd] = useState<number | undefined>(
    undefined,
  );
  const fareId = useAuthStore((state) => state.project?.fare_id);
  const projectId = useAuthStore((state) => state.project?.project_id);
  const environmentId = useAuthStore((state) => state.project?.environment_id);
  const companyId = useAuthStore(
    (state) => state.user?.company_id ?? state.project?.company_id,
  );
  const queryClient = useQueryClient();

  // Balance + credit limit for the current project. Shown in the header and used
  // to route the user into top-up when a plan can't be covered. Only fetched
  // while the dialog is open; shares its cache with the billing tab.
  const { data: companyProjects = [] } = useCompanyProjectsList(
    open ? companyId : null,
    projectId,
  );
  const projectBalanceInfo = companyProjects.find(
    (p) => p.project_id === projectId,
  );
  const balance = projectBalanceInfo?.balance ?? 0;

  const { mutate: attachFare, isPending: isAttaching } = useMutation({
    mutationFn: async (targetFareId: string) => {
      const { data } = await api.patch(
        "/v1/company/project/attach-fare",
        {
          fare_id: targetFareId,
          billing_period_code: PERIOD_CODE[period],
        },
        {
          headers: {
            Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
            "Environment-Id": environmentId ?? "",
          },
        },
      );
      return data;
    },
    onSuccess: (_data, targetFareId) => {
      // Calling AttachFare with the fare the project is already on cancels a
      // scheduled downgrade (see "Cancel downgrade") rather than switching plan.
      const isCancelDowngrade = targetFareId === fareId;
      // A downgrade is scheduled for period end, so the project stays on its
      // current fare until then; an upgrade takes effect immediately.
      const targetFare = fares.find((f: any) => f.id === targetFareId);
      const targetPrice = targetFare ? Number(targetFare.price) || 0 : 0;
      const isDowngrade =
        !isCancelDowngrade &&
        currentPrice != null &&
        targetPrice < currentPrice;

      // For an immediate upgrade the project is now on the target fare. We set
      // it in the store directly because AttachFare returns an empty project and
      // re-fetching company-project can return a stale fare_id -- the fare we
      // just successfully attached is authoritative. Downgrade/cancel keep the
      // current fare_id (the change is scheduled, not applied now).
      if (!isCancelDowngrade && !isDowngrade) {
        const currentProject = useAuthStore.getState().project;
        if (currentProject) {
          useAuthStore.setState({
            project: { ...currentProject, fare_id: targetFareId },
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["fares", "ugen"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "fare"] });
      queryClient.invalidateQueries({ queryKey: ["billing", "company-project"] });
      queryClient.invalidateQueries({
        queryKey: ["billing", "subscription", "current"],
      });
      queryClient.invalidateQueries({ queryKey: ["pricing-company-stats"] });
      if (isCancelDowngrade) {
        toast.success(t('downgradeCanceled'));
      } else {
        toast.success(t('planUpdated'));
        onOpenChange(false);
      }
    },
    onError: (err: any) => {
      // Not enough balance to cover the plan -- silently open the top-up modal
      // (no error toast). The suggested amount was staged on the upgrade click,
      // computed from the plan price and active period (USD → UZS).
      if (parseInsufficientBalance(err) !== null) {
        setTopUpOpen(true);
        return;
      }
      toast.error(mapAttachFareError(err));
    },
    onSettled: () => {
      setPendingFareId(null);
    },
  });

  // Current subscription detail (status, end_date, pending_fare_id). Embedded
  // in the fare-by-id response; only fetched while the dialog is open.
  const { data: currentFareDetail } = useFare(open ? fareId : null, projectId);
  const subscription = currentFareDetail?.subscription;
  const isPendingDowngrade = subscription?.status === "pending_downgrade";

  // Current subscription with billing-period boundaries. /v1/subscription/current
  // returns start_date/end_date/renewal_date directly; prefer it over the dates
  // embedded in the fare-by-id response.
  const { data: currentSubscription } = useCurrentSubscription(projectId, open);
  const planEndDate =
    currentSubscription?.end_date ??
    currentSubscription?.renewal_date ??
    subscription?.end_date;
  const pendingDowngradeFareId = subscription?.pending_fare_id ?? null;
  const currency = (currentFareDetail?.currency || "uzs").toUpperCase();

  // USD → UZS rate from the Central Bank of Uzbekistan, used to convert the plan
  // price into a suggested top-up amount and to show a dollar equivalent for the
  // balance. Only fetched while the dialog is open.
  const { data: usdRate } = useUsdRate(open);
  const balanceUsd =
    currency === "UZS" ? uzsToUsd(balance, usdRate) : null;

  const { data: fareData } = useQuery({
    queryKey: ["fares", "ugen"],
    queryFn: async () => {
      const { data } = await api.get("/v1/fare", {
        params: { product_type: "ugen" },
      });
      return data;
    },
    // Only fetch while the dialog is open, and treat the data as always stale so
    // each open triggers a fresh fetch instead of serving the 5-min cached snapshot.
    enabled: open,
    staleTime: 0,
  });

  const fares: any[] = fareData?.data?.fares || [];

  /* ── Build feature rows grouped by feature group (for compare table) ── */
  const featureMap = new Map<
    string,
    {
      id: string;
      name: string;
      type: string;
      group?: { id: string; name: string };
    }
  >();
  fares.forEach((fare) => {
    fare.fare_item_prices?.forEach((fip: any) => {
      if (!featureMap.has(fip.fare_item_id)) {
        featureMap.set(fip.fare_item_id, fip.fare_item);
      }
    });
  });
  const featureRows = Array.from(featureMap.values());

  const OTHER_GROUP_KEY = "__other__";
  const groupedFeatureRows: {
    key: string;
    name: string;
    items: typeof featureRows;
  }[] = [];
  const groupIndexMap = new Map<string, number>();
  featureRows.forEach((featureItem) => {
    const groupKey = featureItem.group?.id || OTHER_GROUP_KEY;
    const groupName = featureItem.group?.name || "Other";
    let idx = groupIndexMap.get(groupKey);
    if (idx === undefined) {
      idx = groupedFeatureRows.length;
      groupIndexMap.set(groupKey, idx);
      groupedFeatureRows.push({ key: groupKey, name: groupName, items: [] });
    }
    groupedFeatureRows[idx].items.push(featureItem);
  });

  const fareValueMap: Record<string, Record<string, string>> = {};
  fares.forEach((fare) => {
    fareValueMap[fare.id] = {};
    fare.fare_item_prices?.forEach((fip: any) => {
      fareValueMap[fare.id][fip.fare_item_id] = fip.value;
    });
  });

  const fareByName = new Map<string, any>(
    fares.map((f: any) => [String(f.name || "").toLowerCase(), f]),
  );
  const currentFare = fares.find((f: any) => f.id === fareId);
  const currentPrice = currentFare ? Number(currentFare.price) || 0 : null;
  const pendingDowngradeFare = pendingDowngradeFareId
    ? fares.find((f: any) => f.id === pendingDowngradeFareId)
    : null;

  // "Fare fallback" state: the project couldn't pay for its plan renewal so the
  // backend temporarily dropped it to the free tier. pending_fare_id holds the
  // original paid plan the project will be restored to once balance is topped up.
  //
  // Use currentSubscription.fare_id (authoritative from /subscription/current)
  // rather than the auth store's fareId: the store can lag behind a backend
  // auto-downgrade until useSyncCurrentPlan's next fetch, which would leave
  // currentPrice > 0 and hide the banner.
  const subscriptionFare = currentSubscription?.fare_id
    ? (fares.find((f: any) => f.id === currentSubscription.fare_id) ?? currentFare)
    : currentFare;
  const subscriptionPrice = subscriptionFare
    ? Number(subscriptionFare.price) || 0
    : null;

  const pendingFallbackFareId = currentSubscription?.pending_fare_id ?? null;
  const pendingFallbackFare = pendingFallbackFareId
    ? (fares.find((f: any) => f.id === pendingFallbackFareId) ?? null)
    : null;
  const isFareFallback =
    !isPendingDowngrade &&
    subscriptionPrice === 0 &&
    pendingFallbackFareId !== null &&
    // pending fare must be a paid plan (not another free tier)
    (pendingFallbackFare == null || Number(pendingFallbackFare.price) > 0);

  const currentPeriod = PERIODS.find((p) => p.key === period) ?? PERIODS[0];

  const formatPeriodPrice = (monthly: number) =>
    monthly <= 0 ? "$0" : `$${Math.round(monthly * currentPeriod.multiplier)}`;

  // Suggested top-up (USD) for a plan = its dollar price for the active period
  // (per-period monthly × number of months in that period). The top-up modal
  // converts this to UZS for the actual charge.
  const computeTopUpAmountUsd = (fare: any): number | undefined => {
    const monthly = Number(fare?.price) || 0;
    if (monthly <= 0) return undefined;
    return (
      Math.round(monthly * currentPeriod.multiplier) * PERIOD_MONTHS[period]
    );
  };

  const buildFeatures = (fare: any | undefined): string[] => {
    if (!fare?.fare_item_prices) return [];
    return (fare.fare_item_prices as any[])
      .filter((fip) => fip.value && fip.value !== "0")
      .slice(0, 4)
      .map((fip) => {
        const name = fip.fare_item?.name ?? "";
        return `${formatFareValue(fip.value)} ${name}`.trim();
      });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] w-[min(96vw,1100px)] max-w-none gap-0 overflow-y-auto rounded-2xl p-0">
          <div className="border-border-subtle border-b px-6 py-5">
            <DialogHeader>
              <DialogTitle className="text-text-main flex items-center gap-2 text-[1.05rem]">
                <Sparkles size={18} className="text-primary" />
                {t('upgradeYourPlan')}
              </DialogTitle>
              <DialogDescription className="text-text-muted text-[12px]">
                Choose the plan that fits your team. Per-user pricing — pay only
                for what you use.
              </DialogDescription>
            </DialogHeader>

            {/* Billing toggle + current balance */}
            <div className="mt-4 flex flex-col items-center gap-2.5">
              {/* Animated period toggle */}
              <div className="bg-hover-bg border-border-subtle inline-flex rounded-full border p-1 shadow-sm">
                {PERIODS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPeriod(p.key)}
                    className="relative px-5 py-1.5 text-[0.8rem] font-medium"
                  >
                    {period === p.key && (
                      <motion.span
                        className="bg-bg-card absolute inset-0 rounded-full shadow-sm"
                        layoutId="period-bg"
                        transition={{ type: "spring", duration: 0.4 }}
                      />
                    )}
                    <span
                      className={cn(
                        "relative z-10 flex items-center gap-1.5 whitespace-nowrap",
                        period === p.key
                          ? "text-text-main font-semibold"
                          : "text-text-muted",
                      )}
                    >
                      {p.label}
                      {p.save && (
                        <span className="rounded-full bg-green-600 px-1.5 py-0.5 text-[0.6rem] font-bold tracking-[0.02em] text-white">
                          {p.save}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>

              {/* Current balance -- USD first, UZS as the secondary value */}
              <div className="border-border-subtle bg-bg-card text-text-muted inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px]">
                <Wallet size={14} className="text-primary" />
                <span className="font-medium">{t('balance')}</span>
                {balanceUsd != null ? (
                  <>
                    <span className="text-text-main font-semibold whitespace-nowrap">
                      {formatUsd(balanceUsd)}
                    </span>
                    <span className="bg-border-subtle h-3 w-px" />
                    <span className="text-text-muted whitespace-nowrap">
                      ≈ {formatAmount(balance)} {currency}
                    </span>
                  </>
                ) : (
                  <span className="text-text-main font-semibold whitespace-nowrap">
                    {formatAmount(balance)}{" "}
                    <span className="text-text-muted text-[10px] font-bold uppercase">
                      {currency}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Scheduled downgrade banner */}
          {isPendingDowngrade && (
            <div className="mx-6 mt-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <CalendarClock
                size={16}
                className="mt-0.5 shrink-0 text-amber-600"
              />
              <div className="text-[12px] leading-relaxed">
                <p className="font-semibold text-amber-700">
                  Downgrade
                  {pendingDowngradeFare?.name
                    ? ` to ${pendingDowngradeFare.name}`
                    : ""}{" "}
                  scheduled
                  {planEndDate
                    ? ` for ${formatSubscriptionDate(planEndDate)}`
                    : ""}
                </p>
                <p className="text-amber-700/80">
                  Your current plan stays active until then. Use "Cancel
                  downgrade" to keep it.
                </p>
              </div>
            </div>
          )}

          {/* Fare fallback banner — shown when a failed payment dropped the
              project to the free tier; pending_fare_id is the plan to restore */}
          {isFareFallback && (
            <div className="mx-6 mt-6 flex items-center gap-3 rounded-xl border border-yellow-500/60 bg-yellow-400/15 px-4 py-2">
              <AlertTriangle size={15} className="shrink-0 text-yellow-600" strokeWidth={2.5} />
              <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] font-semibold text-yellow-700 dark:text-yellow-400">
                <span className="flex items-center gap-1">
                  <Crown size={11} className="shrink-0" />
                  {pendingFallbackFare?.name
                    ? pendingFallbackFare.name.charAt(0).toUpperCase() + pendingFallbackFare.name.slice(1)
                    : "Paid"}{" "}plan
                </span>
                {planEndDate && (
                  <span className="flex items-center gap-1 font-medium opacity-90">
                    <CalendarX2 size={11} className="shrink-0" />
                    Expired: {formatSubscriptionDate(planEndDate)}
                  </span>
                )}
                <span className="opacity-80">→ now on Free</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (pendingFallbackFare) {
                    setTopUpAmountUsd(computeTopUpAmountUsd(pendingFallbackFare));
                  }
                  setTopUpOpen(true);
                }}
                className="shrink-0 rounded-lg bg-yellow-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-85"
              >
                {t('topUpToRestore')}
              </button>
            </div>
          )}

          {/* Pricing cards */}
          <div className="grid grid-cols-1 gap-5 px-6 py-6 sm:grid-cols-2 lg:grid-cols-[16%_repeat(4,minmax(0,1fr))] lg:gap-0">
            {/* Spacer to align the cards over the compare-table plan columns (the table's Feature column is 16% wide) */}
            <div className="hidden lg:block" aria-hidden="true" />
            {PLAN_META.map((plan) => {
              const fare = plan.fareName ? fareByName.get(plan.fareName) : null;
              const isEnterprise = plan.fareName === null;
              const isFree = fare
                ? Number(fare.price) <= 0
                : plan.fareName === "free";
              const isCurrent = fare ? fare.id === fareId : false;

              const displayName =
                fare?.name ??
                plan.key.charAt(0).toUpperCase() + plan.key.slice(1);
              const displayPrice = isEnterprise
                ? "Custom"
                : fare
                  ? formatPeriodPrice(Number(fare.price) || 0)
                  : "--";
              const numericPrice =
                !isEnterprise && fare
                  ? Math.round((Number(fare.price) || 0) * currentPeriod.multiplier)
                  : null;
              const displayPer = isEnterprise
                ? "tailored to your needs"
                : isFree
                  ? (plan.perFreeText ?? "forever free")
                  : currentPeriod.per;
              const features = fare ? buildFeatures(fare) : [];
              const isPlanLoading = isAttaching && pendingFareId === fare?.id;
              const isDowngrade =
                !isCurrent &&
                !isEnterprise &&
                fare != null &&
                currentPrice != null &&
                (Number(fare.price) || 0) < currentPrice;

              // The fare the project will downgrade to at period end.
              const isScheduled =
                isPendingDowngrade &&
                fare != null &&
                fare.id === pendingDowngradeFareId;
              // Re-attaching the current fare cancels a scheduled downgrade.
              const isCancelDowngrade = isCurrent && isPendingDowngrade;
              // Fare fallback: this card is the plan to restore after topping up.
              const isRestorePlan =
                isFareFallback && fare != null && fare.id === pendingFallbackFareId;
              // Current free plan shown as temporary during fare fallback.
              const isFallbackCurrent = isCurrent && isFareFallback;


              let ctaLabel: string;
              if (isCancelDowngrade) {
                ctaLabel = "Cancel downgrade";
              } else if (isFallbackCurrent) {
                ctaLabel = "Current plan (temporary)";
              } else if (isRestorePlan) {
                ctaLabel = `Restore ${displayName}`;
              } else if (isCurrent) {
                ctaLabel = "Current plan";
              } else if (isScheduled) {
                ctaLabel = "Scheduled";
              } else if (isDowngrade) {
                ctaLabel = `Downgrade to ${displayName}`;
              } else {
                ctaLabel = plan.cta;
              }

              // The current plan's button is normally disabled, but stays
              // actionable when it cancels a pending downgrade or restores a plan.
              const buttonDisabled =
                isCancelDowngrade || isScheduled
                  ? isScheduled || isAttaching
                  : isRestorePlan
                    ? isAttaching
                    : isCurrent || plan.key === "free" || !fare || isAttaching;
              // Cancel-downgrade re-attaches the current fare; everything else
              // attaches the card's own fare.
              const targetFareId = isCancelDowngrade ? fareId : fare?.id;

              const featuresDisplay =
                features.length > 0
                  ? features
                  : isEnterprise
                    ? [
                        "Custom Builders",
                        "Custom credit limit",
                        "Custom Projects",
                      ]
                    : [];

              return (
                <div
                  key={plan.key}
                  className={cn(
                    "relative flex flex-col overflow-hidden rounded-xl border shadow-[0_2px_12px_0_rgba(0,0,0,0.06)] transition-all hover:shadow-[0_4px_20px_0_rgba(0,0,0,0.1)] lg:mx-1.5",
                    plan.featured && "z-10",
                    (isCurrent && !isFareFallback) || isRestorePlan
                      ? "border-primary shadow-[0_4px_20px_0_rgba(0,0,0,0.1)]"
                      : "border-border-subtle",
                  )}
                >
                  {/* ── Card Header ── */}
                  <div
                    className={cn(
                      "relative border-b border-border-subtle/50 p-5",
                      (isCurrent && !isFareFallback) && "bg-primary/8",
                      isRestorePlan && "bg-primary/5",
                    )}
                  >
                    {/* Badges -- top-right corner */}
                    <AnimatePresence mode="popLayout">
                      <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1">
                        {isFallbackCurrent ? (
                          <motion.div
                            key="temporary-badge"
                            animate={{ opacity: 1, scale: 1 }}
                            className="rounded-md bg-amber-500 px-2 py-0.5 text-[0.62rem] font-bold tracking-[0.07em] whitespace-nowrap text-white uppercase"
                            exit={{ opacity: 0, scale: 0.8 }}
                            initial={{ opacity: 0, scale: 0.8 }}
                          >
                            {t('temporary')}
                          </motion.div>
                        ) : isRestorePlan ? (
                          <motion.div
                            key="restore-badge"
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-primary flex items-center gap-1 rounded-md px-2 py-0.5 text-[0.62rem] font-bold tracking-[0.07em] whitespace-nowrap text-white uppercase"
                            exit={{ opacity: 0, scale: 0.8 }}
                            initial={{ opacity: 0, scale: 0.8 }}
                          >
                            <RotateCcw size={9} />
                            {t('restore')}
                          </motion.div>
                        ) : isCurrent ? (
                          <motion.div
                            key="current-badge"
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-primary rounded-md px-2 py-0.5 text-[0.62rem] font-bold tracking-[0.07em] whitespace-nowrap text-white uppercase"
                            exit={{ opacity: 0, scale: 0.8 }}
                            initial={{ opacity: 0, scale: 0.8 }}
                          >
                            {t('current')}
                          </motion.div>
                        ) : isScheduled ? (
                          <motion.div
                            key="scheduled-badge"
                            animate={{ opacity: 1, scale: 1 }}
                            className="rounded-md bg-amber-500 px-2 py-0.5 text-[0.62rem] font-bold tracking-[0.07em] whitespace-nowrap text-white uppercase"
                            exit={{ opacity: 0, scale: 0.8 }}
                            initial={{ opacity: 0, scale: 0.8 }}
                          >
                            {t('scheduled')}
                          </motion.div>
                        ) : plan.featured && plan.badge ? (
                          <motion.div
                            key="popular-badge"
                            animate={{ opacity: 1, scale: 1 }}
                            className="border-border-subtle bg-bg-card flex items-center gap-1 rounded-md border px-2 py-0.5 text-[0.7rem]"
                            exit={{ opacity: 0, scale: 0.8 }}
                            initial={{ opacity: 0, scale: 0.8 }}
                          >
                            <Star
                              size={10}
                              className="text-text-main fill-current"
                            />
                            <span className="text-text-main font-medium">
                              {plan.badge}
                            </span>
                          </motion.div>
                        ) : null}

                      </div>
                    </AnimatePresence>

                    <div className="text-text-main pr-16 font-medium text-base">
                      {displayName}
                    </div>
                    <p className="text-text-muted mt-0.5 text-[0.75rem]">
                      {plan.desc}
                    </p>

                    <div className="mt-5 mb-1 flex items-end gap-1">
                      {numericPrice !== null ? (
                        <NumberFlow
                          value={numericPrice}
                          prefix="$"
                          suffix="/mo"
                          format={{ notation: "compact" }}
                          className="text-text-main font-extrabold leading-none text-[2.2rem] [&::part(suffix)]:text-text-muted [&::part(suffix)]:text-sm [&::part(suffix)]:font-normal"
                        />
                      ) : (
                        <span className="text-text-main font-extrabold leading-none text-[2.2rem]">
                          {displayPrice}
                        </span>
                      )}
                    </div>
                    <p className="text-text-muted text-[0.7rem]">{displayPer}</p>

                    {/* When the current paid plan ends -- renewal date, or the
                     * switch-over date when a downgrade is scheduled. */}
                    {isCurrent && !isFree && planEndDate && (
                      <div
                        className={cn(
                          "mt-2.5 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[0.72rem] font-semibold",
                          isPendingDowngrade
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-primary/10 text-primary",
                        )}
                      >
                        <CalendarClock size={12} className="shrink-0" />
                        {isPendingDowngrade ? "Ends" : "Renews"}{" "}
                        {formatSubscriptionDate(planEndDate)}
                      </div>
                    )}
                  </div>

                  {/* ── Features ── */}
                  <div
                    className="flex-1 space-y-2.5 px-5 pt-5 pb-6"
                  >
                    {featuresDisplay.map((f) => (
                      <div key={f} className="flex items-start gap-2">
                        <CheckCircle2
                          size={14}
                          className="mt-0.5 shrink-0 text-green-500"
                          strokeWidth={2.5}
                        />
                        <p className="text-text-muted text-[0.8rem]">{f}</p>
                      </div>
                    ))}
                  </div>

                  {/* ── CTA ── */}
                  <div className="mt-auto border-t border-border-subtle/50 p-3">
                    {plan.href ? (
                      <a
                        href={plan.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "block w-full rounded-lg border py-2 text-center text-[0.82rem] font-semibold no-underline transition-all",
                          !isFree
                            ? "bg-primary border-primary text-white hover:opacity-85"
                            : "bg-hover-bg border-border-subtle text-text-muted hover:text-text-main",
                        )}
                      >
                        {ctaLabel}
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled={buttonDisabled}
                        onClick={() => {
                          if (!targetFareId) return;
                          setTopUpAmountUsd(computeTopUpAmountUsd(fare));
                          setPendingFareId(targetFareId);
                          attachFare(targetFareId);
                        }}
                        className={cn(
                          "flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border py-2 text-[0.82rem] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50",
                          isCancelDowngrade
                            ? "border-amber-500 bg-amber-500 text-white hover:opacity-85"
                            : !isFree
                              ? "bg-primary border-primary text-white hover:opacity-85"
                              : "bg-hover-bg border-border-subtle text-text-muted hover:text-text-main",
                        )}
                      >
                        {isPlanLoading && (
                          <Loader2 size={14} className="animate-spin" />
                        )}
                        {ctaLabel}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compare plans (collapsible, dynamic from API) */}
          {fares.length > 0 && groupedFeatureRows.length > 0 && (
            <div className="border-border-subtle border-t px-6 pb-6">
              <button
                type="button"
                onClick={() => setCompareOpen((v) => !v)}
                className="text-text-muted hover:text-text-main flex w-full items-center justify-between py-4 text-left text-[0.9rem] font-semibold transition-colors"
                aria-expanded={compareOpen}
              >
                <span>
                  Compare{" "}
                  <em className="from-primary to-accent bg-linear-to-r bg-clip-text text-transparent not-italic">
                    plans
                  </em>
                </span>
                <ChevronDown
                  size={16}
                  className={cn(
                    "transition-transform duration-200",
                    compareOpen && "rotate-180",
                  )}
                />
              </button>

              {compareOpen && (
                <div className="overflow-x-auto">
                  <table
                    className="w-full table-fixed border-collapse text-[0.82rem]"
                    style={{ minWidth: "820px" }}
                  >
                    <thead>
                      <tr className="border-border-subtle border-b-2">
                        <th className="text-text-muted w-[16%] px-3 py-2.5 text-left text-[0.8rem] font-semibold">
                          {t('feature')}
                        </th>
                        {fares.map((fare) => {
                          const isCurrent = fare.id === fareId;
                          return (
                            <th
                              key={fare.id}
                              className={cn(
                                "relative w-[21%] px-3 py-2.5 font-bold",
                                isCurrent
                                  ? "bg-primary/5 text-primary border-x-primary/30 border-t-primary border-x border-t-2"
                                  : "text-text-main",
                              )}
                            >
                              <div>
                                {fare.name}
                                {isCurrent && " ✓"}
                              </div>
                              <div
                                className={cn(
                                  "mt-0.5 text-[11px] font-normal normal-case",
                                  isCurrent
                                    ? "text-primary/70"
                                    : "text-text-muted",
                                )}
                              >
                                {fare.price > 0 ? `$${fare.price}/mo` : "Free"}
                              </div>
                            </th>
                          );
                        })}
                        <th className="text-text-main relative w-[21%] px-3 py-2.5 font-bold">
                          <div>{t('enterprise')}</div>
                          <div className="text-text-muted mt-0.5 text-[11px] font-normal normal-case">
                            {t('custom')}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedFeatureRows.map((group, groupIdx) => {
                        const isLastGroup =
                          groupIdx === groupedFeatureRows.length - 1;
                        return (
                          <Fragment key={group.key}>
                            <tr className="bg-hover-bg">
                              <td
                                colSpan={fares.length + 2}
                                className="text-text-muted/70 px-3 py-1.5 text-[0.68rem] font-bold tracking-[0.07em] uppercase"
                              >
                                {group.name}
                              </td>
                            </tr>
                            {group.items.map((featureItem, itemIdx) => {
                              const isLastRow =
                                isLastGroup &&
                                itemIdx === group.items.length - 1;
                              return (
                                <tr
                                  key={featureItem.id}
                                  className="border-border-subtle/50 border-b"
                                >
                                  <td className="text-text-muted px-3 py-2.5">
                                    {featureItem.name}
                                  </td>
                                  {fares.map((fare) => {
                                    const isCurrent = fare.id === fareId;
                                    const rawValue =
                                      fareValueMap[fare.id]?.[featureItem.id];
                                    const displayValue =
                                      formatFareValue(rawValue);
                                    return (
                                      <td
                                        key={fare.id}
                                        className={cn(
                                          "px-3 py-2.5 text-center",
                                          isCurrent
                                            ? cn(
                                                "bg-primary/5 text-primary border-x-primary/30 border-x font-semibold",
                                                isLastRow &&
                                                  "border-b-primary border-b-2",
                                              )
                                            : "text-text-muted",
                                        )}
                                      >
                                        {displayValue}
                                      </td>
                                    );
                                  })}
                                  <td className="text-text-muted px-3 py-2.5 text-center">
                                    {t('custom')}
                                  </td>
                                </tr>
                              );
                            })}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <TopUpModal
        open={topUpOpen}
        onOpenChange={setTopUpOpen}
        projectId={projectId ?? null}
        initialAmount={topUpAmountUsd}
        onSuccess={() => {
          // Reflect the new balance in the header so the user can complete the
          // upgrade with sufficient funds.
          queryClient.invalidateQueries({
            queryKey: ["billing", "company-project"],
          });
        }}
      />
    </>
  );
};
