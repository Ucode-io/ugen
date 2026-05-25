"use client";

import { Fragment, useState } from "react";
import { Check, ChevronDown, Loader2, Sparkles } from "lucide-react";
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

/* ── Billing periods ── */
const PERIODS = [
  {
    key: "year",
    label: "Annual",
    save: "Save 24%",
    multiplier: 0.76,
    per: "per user · billed annually",
  },
  {
    key: "6month",
    label: "6 months",
    save: "Save 13%",
    multiplier: 0.87,
    per: "per user · billed every 6 months",
  },
  {
    key: "month",
    label: "Monthly",
    save: null,
    multiplier: 1,
    per: "per user · billed monthly",
  },
] as const;
type Period = (typeof PERIODS)[number]["key"];

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
    badge: "Most popular",
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

const formatFareValue = (value: string | undefined) => {
  if (!value || value === "-1") return "Unlimited";
  if (value === "0") return "—";
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
  const [period, setPeriod] = useState<Period>("year");
  const [compareOpen, setCompareOpen] = useState(false);
  const [pendingFareId, setPendingFareId] = useState<string | null>(null);
  const fareId = useAuthStore((state) => state.project?.fare_id);
  const environmentId = useAuthStore((state) => state.project?.environment_id);
  const queryClient = useQueryClient();

  const { mutate: attachFare, isPending: isAttaching } = useMutation({
    mutationFn: async (targetFareId: string) => {
      const { data } = await api.patch(
        "/v1/company/project/attach-fare",
        {
          fare_id: targetFareId,
          discount_id: "ce1809e3-85db-4f94-b7fd-a8623530297b",
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
      // Reflect the new plan in the store immediately (no dedicated setter exists)
      const currentProject = useAuthStore.getState().project;
      if (currentProject) {
        useAuthStore.setState({
          project: { ...currentProject, fare_id: targetFareId },
        });
      }
      queryClient.invalidateQueries({ queryKey: ["fares", "ugen"] });
      queryClient.invalidateQueries({ queryKey: ["pricing-company-stats"] });
      toast.success("Plan updated successfully");
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.description || "Failed to update plan");
    },
    onSettled: () => {
      setPendingFareId(null);
    },
  });

  const { data: fareData } = useQuery({
    queryKey: ["fares", "ugen"],
    queryFn: async () => {
      const { data } = await api.get("/v1/fare", {
        params: { product_type: "ugen" },
      });
      return data;
    },
  });

  const fares: any[] = fareData?.data?.fares || [];

  /* ── Build feature rows grouped by feature group (for compare table) ── */
  const featureMap = new Map<
    string,
    { id: string; name: string; type: string; group?: { id: string; name: string } }
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
  const currentPeriod = PERIODS.find((p) => p.key === period) ?? PERIODS[0];

  const formatPeriodPrice = (monthly: number) =>
    monthly <= 0 ? "$0" : `$${Math.round(monthly * currentPeriod.multiplier)}`;

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[min(96vw,1100px)] max-w-none gap-0 overflow-y-auto rounded-2xl p-0">
        <div className="border-border-subtle border-b px-6 py-5">
          <DialogHeader>
            <DialogTitle className="text-text-main flex items-center gap-2 text-[1.05rem]">
              <Sparkles size={18} className="text-primary" />
              Upgrade your plan
            </DialogTitle>
            <DialogDescription className="text-text-muted text-[12px]">
              Choose the plan that fits your team. Per-user pricing — pay only
              for what you use.
            </DialogDescription>
          </DialogHeader>

          {/* Billing toggle */}
          <div className="mt-4 flex justify-center">
            <div className="bg-hover-bg border-border-subtle inline-flex gap-0.5 rounded-[10px] border p-1">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 rounded-lg border-none px-4 py-1.5 text-[0.8rem] font-medium whitespace-nowrap transition-all",
                    period === p.key
                      ? "bg-bg-card text-text-main font-semibold shadow-sm"
                      : "text-text-muted hover:text-text-main bg-transparent",
                  )}
                >
                  {p.label}
                  {p.save && (
                    <span className="rounded-full bg-green-600 px-1.5 py-0.5 text-[0.6rem] font-bold tracking-[0.02em] text-white">
                      {p.save}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 gap-4 px-6 py-6 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_META.map((plan) => {
            const fare = plan.fareName ? fareByName.get(plan.fareName) : null;
            const isEnterprise = plan.fareName === null;
            const isFree = fare
              ? Number(fare.price) <= 0
              : plan.fareName === "free";
            const isCurrent = fare ? fare.id === fareId : false;

            const displayName =
              fare?.name ?? plan.key.charAt(0).toUpperCase() + plan.key.slice(1);
            const displayPrice = isEnterprise
              ? "Custom"
              : fare
                ? formatPeriodPrice(Number(fare.price) || 0)
                : "—";
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
            const ctaLabel = isCurrent
              ? "Current plan"
              : isDowngrade
                ? `Downgrade to ${displayName}`
                : plan.cta;

            return (
              <div
                key={plan.key}
                className={cn(
                  "bg-bg-main relative flex flex-col rounded-[10px] border p-6 transition-all hover:shadow-md",
                  isCurrent
                    ? "border-primary shadow-md"
                    : "border-border-subtle hover:border-border-subtle/60",
                )}
              >
                {isCurrent ? (
                  <div className="bg-primary absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[0.62rem] font-bold tracking-[0.07em] text-white uppercase whitespace-nowrap">
                    Current
                  </div>
                ) : (
                  plan.featured &&
                  plan.badge && (
                    <div className="bg-primary absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[0.62rem] font-bold tracking-[0.07em] text-white uppercase whitespace-nowrap">
                      {plan.badge}
                    </div>
                  )
                )}
                <div className="text-text-muted mb-[7px] text-[0.74rem] font-semibold tracking-[0.06em] uppercase">
                  {displayName}
                </div>
                <div
                  className="text-text-main mb-1 flex items-end font-black tracking-[-0.05em]"
                  style={{
                    fontSize: isEnterprise ? "1.6rem" : "2.2rem",
                    lineHeight: 1,
                    minHeight: "2.2rem",
                  }}
                >
                  {displayPrice}
                  {!isEnterprise && (
                    <span className="text-text-muted text-[0.85rem] font-normal">
                      /mo
                    </span>
                  )}
                </div>
                <p className="text-text-muted mb-1 text-[0.68rem]">
                  {displayPer}
                </p>
                <p className="text-text-muted mt-3 mb-4 min-h-[3.6rem] text-[0.78rem] leading-[1.55]">
                  {plan.desc}
                </p>
                <hr className="border-border-subtle mb-4 border-t" />
                <ul className="mb-5 space-y-2">
                  {(features.length > 0
                    ? features
                    : isEnterprise
                      ? ["Custom Builders", "Custom credit limit", "Custom Projects"]
                      : []
                  ).map((f) => (
                    <li
                      key={f}
                      className="text-text-muted flex items-start gap-2 text-[0.8rem]"
                    >
                      <Check
                        size={13}
                        className="mt-0.5 flex-shrink-0 text-green-500"
                        strokeWidth={3}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                {plan.href ? (
                  <a
                    href={plan.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "mt-auto block w-full rounded-lg border py-2 text-center text-[0.82rem] font-semibold no-underline transition-all",
                      !isFree
                        ? "bg-primary border-primary text-white hover:opacity-85"
                        : "bg-hover-bg border-border-subtle text-text-muted hover:border-border-subtle/60 hover:text-text-main",
                    )}
                  >
                    {ctaLabel}
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled={
                      isCurrent || plan.key === "free" || !fare || isAttaching
                    }
                    onClick={() => {
                      if (!fare) return;
                      setPendingFareId(fare.id);
                      attachFare(fare.id);
                    }}
                    className={cn(
                      "mt-auto flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border py-2 text-[0.82rem] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50",
                      !isFree
                        ? "bg-primary border-primary text-white hover:opacity-85"
                        : "bg-hover-bg border-border-subtle text-text-muted hover:border-border-subtle/60 hover:text-text-main",
                    )}
                  >
                    {isPlanLoading && (
                      <Loader2 size={14} className="animate-spin" />
                    )}
                    {ctaLabel}
                  </button>
                )}
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
                <em className="from-primary to-accent not-italic bg-linear-to-r bg-clip-text text-transparent">
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
                        Feature
                      </th>
                      {fares.map((fare) => {
                        const isCurrent = fare.id === fareId;
                        return (
                          <th
                            key={fare.id}
                            className={cn(
                              "relative w-[20%] px-3 py-2.5 font-bold",
                              isCurrent
                                ? "bg-primary/5 text-primary border-x border-x-primary/30 border-t-2 border-t-primary"
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
                      <th className="text-text-main relative w-[20%] px-3 py-2.5 font-bold">
                        <div>Enterprise</div>
                        <div className="text-text-muted mt-0.5 text-[11px] font-normal normal-case">
                          Custom
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
                                  const displayValue = formatFareValue(rawValue);
                                  return (
                                    <td
                                      key={fare.id}
                                      className={cn(
                                        "px-3 py-2.5 text-center",
                                        isCurrent
                                          ? cn(
                                              "bg-primary/5 text-primary border-x border-x-primary/30 font-semibold",
                                              isLastRow &&
                                                "border-b-2 border-b-primary",
                                            )
                                          : "text-text-muted",
                                      )}
                                    >
                                      {displayValue}
                                    </td>
                                  );
                                })}
                                <td className="text-text-muted px-3 py-2.5 text-center">
                                  Custom
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
  );
};
