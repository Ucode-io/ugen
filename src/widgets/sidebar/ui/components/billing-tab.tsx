"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Wallet,
  Inbox,
  Sparkles,
  CalendarClock,
  Receipt,
  ArrowUpRight,
  Package,
  ShoppingCart,
  AlertTriangle,
  Gauge,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button, Skeleton } from "@/shared/ui";
import { cn } from "@/shared/lib/utils/cn";
import { useAuthStore } from "@/entities/session";
import {
  useCompanyProjectsList,
  useFare,
  useCurrentSubscription,
  useTransactions,
  useUsdRate,
  uzsToUsd,
  formatUsd,
  useTokenPacks,
  useTokenPackBalance,
  usePricingCompanyStats,
  usePurchaseTokenPack,
  type BillingTransaction,
  type TokenPack,
  type TokenUsagePeriod,
} from "@/entities/billing";
import { UpgradePlanDialog } from "./upgrade-plan-dialog";
import { TopUpModal, formatAmount, pickErrorMessage } from "./top-up-modal";

const formatTransactionDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "dd.MM.yyyy, HH:mm");
};

const formatPlanDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "dd MMM yyyy");
};

const formatTokens = (value: number | undefined | null) =>
  new Intl.NumberFormat("en-US").format(Number(value ?? 0));

const formatCompactTokens = (value: number | undefined | null) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value ?? 0));

const getPlanTokenUsage = (period?: TokenUsagePeriod) =>
  period?.plan_tokens ??
  ((period?.input_tokens ?? 0) + (period?.output_tokens ?? 0));

const getCurrencyLabel = (pack: TokenPack) =>
  pack.currency?.symbol || pack.currency?.code?.toUpperCase() || "";

const formatPackPrice = (pack: TokenPack) => {
  const currency = getCurrencyLabel(pack);
  return `${formatAmount(pack.price)}${currency ? ` ${currency}` : ""}`;
};

const getPurchaseErrorMessage = (err: any) => {
  const status = err?.response?.status;
  if (status === 402) {
    return "Insufficient project balance. Top up balance.";
  }
  if (status === 404) {
    return "Token pack unavailable. Refreshing list.";
  }
  if (status === 400) {
    return "Invalid token pack. Refresh the list and try again.";
  }
  return pickErrorMessage(err, "Failed to purchase token pack");
};

export const BillingTab = () => {
  const user = useAuthStore((s) => s.user);
  const project = useAuthStore((s) => s.project);
  const projectId = project?.project_id ?? null;
  const companyId = user?.company_id ?? project?.company_id ?? null;
  const fareId = project?.fare_id ?? null;

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const { data: companyProjects = [] } = useCompanyProjectsList(
    // companyId,
    projectId,
  );
  const { data: fare, isLoading: fareLoading } = useFare(fareId, projectId);
  const { data: currentSubscription, isLoading: subscriptionLoading } =
    useCurrentSubscription(projectId);
  const { data: transactions = [], isLoading: transactionsLoading } =
    useTransactions(projectId);

  // Billing-period end -- /v1/subscription/current is authoritative; fall back to
  // the date embedded in the fare-by-id response.
  const planEndDate =
    currentSubscription?.end_date ??
    currentSubscription?.renewal_date ??
    fare?.subscription?.end_date;

  // Free plan has no billing period, so it never surfaces an expire date.
  const isFreePlan =
    currentSubscription?.type === "free" ||
    (fare ? Number(fare.price) <= 0 : false);

  const currentProject = useMemo(
    () =>
      companyProjects.find((p) => p.project_id === projectId) ??
      companyProjects[0],
    [companyProjects, projectId],
  );

  const currency = (fare?.currency || "uzs").toLowerCase();

  const { data: usdRate } = useUsdRate();
  const balance = currentProject?.balance ?? 0;
  const balanceUsd = currency === "uzs" ? uzsToUsd(balance, usdRate) : null;

  return (
    <div className="space-y-4">
      <InvoiceSummaryCard
        balance={balance}
        balanceUsd={balanceUsd}
        planName={fare?.name}
        totalAmount={fare?.price}
        expireDate={isFreePlan ? undefined : planEndDate}
        currency={currency}
        isLoading={fareLoading || subscriptionLoading}
        onTopUp={() => setTopUpOpen(true)}
        onUpgrade={() => setUpgradeOpen(true)}
      />
      <ExtraUsageCard
        projectId={projectId}
        onTopUp={() => setTopUpOpen(true)}
      />
      <TransactionsTable
        transactions={transactions}
        isLoading={transactionsLoading}
      />

      <TopUpModal
        open={topUpOpen}
        onOpenChange={setTopUpOpen}
        projectId={projectId}
      />

      <UpgradePlanDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  );
};

const InvoiceSummaryCard = ({
  balance,
  balanceUsd,
  planName,
  totalAmount,
  expireDate,
  currency,
  isLoading,
  onTopUp,
  onUpgrade,
}: {
  balance: number;
  balanceUsd?: number | null;
  planName?: string;
  totalAmount?: number;
  expireDate?: string;
  currency: string;
  isLoading: boolean;
  onTopUp: () => void;
  onUpgrade: () => void;
}) => {
  const meta = [
    {
      icon: Sparkles,
      label: "Plan",
      value: planName ?? "—",
      tone: "bg-violet-500/10 text-violet-600",
    },
    {
      icon: Receipt,
      label: "Total",
      value: `${formatAmount(totalAmount)} ${currency}`,
      tone: "bg-amber-500/10 text-amber-600",
    },
    // Omitted for the free plan (no billing period -> no expire date passed in).
    ...(expireDate
      ? [
          {
            icon: CalendarClock,
            label: "Expires",
            value: formatPlanDate(expireDate),
            tone: "bg-emerald-500/10 text-emerald-600",
          },
        ]
      : []),
  ];

  return (
    <section className="border-border-subtle bg-bg-card shrink-0 overflow-hidden rounded-xl border shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[1fr_2fr]">
        {/* Balance + Top up */}
        <div className="from-primary/10 via-bg-card to-bg-card border-border-subtle relative flex flex-col overflow-hidden border-b bg-linear-to-br p-4 lg:border-r lg:border-b-0">
          <div className="bg-primary/10 absolute -top-10 -right-10 h-28 w-28 rounded-full blur-2xl" />
          <div className="relative flex items-center justify-between gap-3">
            <p className="text-text-muted text-[11px] font-semibold tracking-wider uppercase">
              Current balance
            </p>
            <div className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-lg">
              <Wallet size={15} />
            </div>
          </div>
          <div className="relative mt-3 flex items-baseline gap-1.5">
            <span className="text-text-main text-[34px] leading-none font-semibold tracking-tight">
              {balanceUsd != null ? formatUsd(balanceUsd) : formatAmount(balance)}
            </span>
            {balanceUsd == null && (
              <span className="text-text-muted text-[11px] font-bold tracking-wider uppercase">
                {currency}
              </span>
            )}
          </div>
          {balanceUsd != null && (
            <p className="text-text-muted relative mt-1.5 text-[13px] font-medium">
              ≈ {formatAmount(balance)}{" "}
              <span className="uppercase">{currency}</span>
            </p>
          )}
          <p className="text-text-muted relative mt-2 text-[11px]">
            Funds available for project usage and upcoming charges.
          </p>

          <Button
            onClick={onTopUp}
            className="relative mt-4 h-9 w-full rounded-lg px-4 text-[13px] font-semibold text-white shadow-sm"
          >
            <Plus size={15} />
            Top up balance
          </Button>
        </div>

        {/* Invoice overview */}
        <div className="flex flex-col p-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <h3 className="text-text-main text-[15px] font-semibold">
                Invoice overview
              </h3>
              <p className="text-text-muted mt-1 text-[12px]">
                Plan details and next billing period.
              </p>
            </div>
            <button
              type="button"
              onClick={onUpgrade}
              className="bg-primary hover:bg-primary/90 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold text-white shadow-sm transition-colors"
            >
              <ArrowUpRight size={14} />
              Upgrade
            </button>
          </div>

          <div className="grid flex-1 gap-3 sm:grid-cols-3">
            {meta.map(({ icon: Icon, label, value, tone }) => (
              <div
                key={label}
                className="border-border-subtle bg-bg-sidebar/40 flex flex-col justify-between rounded-xl border p-4"
              >
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    tone,
                  )}
                >
                  <Icon size={16} />
                </div>
                <div className="mt-4">
                  <p className="text-text-muted text-[11px] font-semibold tracking-wider uppercase">
                    {label}
                  </p>
                  {isLoading ? (
                    <Skeleton className="mt-1 h-5 w-24" />
                  ) : (
                    <p className="text-text-main mt-1 truncate text-[15px] font-semibold">
                      {value}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const ExtraUsageCard = ({
  projectId,
  onTopUp,
}: {
  projectId: string | null;
  onTopUp: () => void;
}) => {
  const {
    data: packs = [],
    isLoading: packsLoading,
    isError: packsError,
    refetch: refetchPacks,
  } = useTokenPacks(projectId);
  const { data: packBalance, isLoading: balanceLoading } =
    useTokenPackBalance(projectId);
  const { data: companyStats, isLoading: statsLoading } =
    usePricingCompanyStats(projectId);
  const { mutateAsync: purchaseTokenPack, isPending: purchasePending } =
    usePurchaseTokenPack(projectId);
  const [purchasingPackId, setPurchasingPackId] = useState<string | null>(null);

  const tokenStats = companyStats?.tokens;
  const daily = tokenStats?.daily;
  const monthly = tokenStats?.monthly;
  const activeSource = tokenStats?.active_source ?? "plan";
  const remainingTokens =
    tokenStats?.pack_remaining ?? packBalance?.remaining_tokens ?? 0;

  const isUsingPack = activeSource === "pack";
  const isExhausted = activeSource === "exhausted";
  const anyLimitReached = Boolean(
    daily?.limit_reached || monthly?.limit_reached,
  );

  const statusMeta = isExhausted
    ? {
        label: "Exhausted",
        tone: "border-red-500/20 bg-red-500/10 text-red-600",
      }
    : isUsingPack
      ? {
          label: "Using pack",
          tone: "border-cyan-500/20 bg-cyan-500/10 text-cyan-600",
        }
      : {
          label: "Plan tokens",
          tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
        };

  const handlePurchase = async (pack: TokenPack) => {
    if (!projectId || purchasePending) return;
    setPurchasingPackId(pack.id);
    try {
      const result = await purchaseTokenPack(pack.id);
      const addedTokens = result.tokens_added ?? pack.token_amount ?? 0;
      toast.success(`${formatTokens(addedTokens)} tokens added`);
    } catch (err: any) {
      const status = err?.response?.status;
      toast.error(getPurchaseErrorMessage(err));
      if (status === 402) {
        onTopUp();
      }
      if (status === 404) {
        void refetchPacks();
      }
    } finally {
      setPurchasingPackId(null);
    }
  };

  return (
    <section className="border-border-subtle bg-bg-card overflow-hidden rounded-xl border shadow-sm">
      <div className="border-border-subtle flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
            <Package size={14} />
          </div>
          <div className="min-w-0">
            <h3 className="text-text-main text-[13px] leading-tight font-semibold">
              Extra usage
            </h3>
            <p className="text-text-muted mt-0.5 truncate text-[11px]">
              Company token pack balance and AI plan usage.
            </p>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase",
            statusMeta.tone,
          )}
        >
          {statusMeta.label}
        </span>
      </div>

      <div className="grid gap-3 p-4 lg:grid-cols-[280px_1fr]">
        <div
          className={cn(
            "border-border-subtle bg-bg-sidebar/50 rounded-xl border p-4",
            isExhausted && "border-red-500/20 bg-red-500/5",
            isUsingPack && "border-cyan-500/20 bg-cyan-500/5",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-text-muted text-[11px] font-semibold tracking-wider uppercase">
                Pack balance
              </p>
              {balanceLoading || statsLoading ? (
                <Skeleton className="mt-2 h-8 w-36" />
              ) : (
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-text-main text-[28px] leading-none font-semibold tracking-tight">
                    {formatCompactTokens(remainingTokens)}
                  </span>
                  <span className="text-text-muted text-[11px] font-bold tracking-wider uppercase">
                    tokens
                  </span>
                </div>
              )}
            </div>
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                isExhausted
                  ? "bg-red-500/10 text-red-600"
                  : isUsingPack
                    ? "bg-cyan-500/10 text-cyan-600"
                    : "bg-emerald-500/10 text-emerald-600",
              )}
            >
              {isExhausted ? <AlertTriangle size={15} /> : <Gauge size={15} />}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <PlanTokenMeter
              label="Daily plan"
              period={daily}
              isLoading={statsLoading}
            />
            <PlanTokenMeter
              label="Monthly plan"
              period={monthly}
              isLoading={statsLoading}
            />
          </div>

          {(isUsingPack || isExhausted || anyLimitReached) && (
            <div
              className={cn(
                "mt-4 rounded-lg border px-3 py-2 text-[11px] leading-relaxed",
                isExhausted
                  ? "border-red-500/20 bg-red-500/10 text-red-700"
                  : "border-cyan-500/20 bg-cyan-500/10 text-cyan-700",
              )}
            >
              {isExhausted
                ? "AI token limit is exhausted. Buy a token pack to continue."
                : `Running on extra tokens. ${formatTokens(remainingTokens)} left.`}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <h4 className="text-text-main text-[13px] font-semibold">
                Token packs
              </h4>
              <p className="text-text-muted mt-0.5 text-[11px]">
                Purchase from the current project balance.
              </p>
            </div>
          </div>

          {packsLoading ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[126px] rounded-xl" />
              ))}
            </div>
          ) : packsError ? (
            <div className="border-border-subtle bg-bg-sidebar/50 flex min-h-[126px] flex-col items-center justify-center rounded-xl border px-4 text-center">
              <AlertTriangle size={18} className="text-text-muted/70" />
              <p className="text-text-main mt-2 text-[13px] font-semibold">
                Token packs unavailable
              </p>
              <button
                type="button"
                onClick={() => refetchPacks()}
                className="text-primary mt-1 text-[12px] font-semibold hover:underline"
              >
                Retry
              </button>
            </div>
          ) : packs.length === 0 ? (
            <div className="border-border-subtle bg-bg-sidebar/50 flex min-h-[126px] flex-col items-center justify-center rounded-xl border px-4 text-center">
              <Package size={18} className="text-text-muted/70" />
              <p className="text-text-main mt-2 text-[13px] font-semibold">
                No token packs available
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {packs.map((pack) => {
                const isPurchasing =
                  purchasePending && purchasingPackId === pack.id;
                return (
                  <div
                    key={pack.id}
                    className="border-border-subtle bg-bg-sidebar/40 flex min-h-[126px] flex-col justify-between rounded-xl border p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-text-main truncate text-[13px] font-semibold">
                          {pack.name ||
                            `${formatCompactTokens(pack.token_amount)} tokens`}
                        </p>
                        <p className="text-text-muted mt-1 text-[11px]">
                          {formatTokens(pack.token_amount)} tokens
                        </p>
                      </div>
                      <span className="bg-primary/10 text-primary shrink-0 rounded-md px-2 py-1 text-[11px] font-bold">
                        {formatPackPrice(pack)}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      loading={isPurchasing}
                      disabled={!projectId || (purchasePending && !isPurchasing)}
                      onClick={() => void handlePurchase(pack)}
                      className="mt-3 h-8 w-full rounded-lg text-[12px] font-semibold text-white"
                    >
                      {!isPurchasing && <ShoppingCart size={14} />}
                      {isPurchasing ? "Purchasing" : "Purchase"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const PlanTokenMeter = ({
  label,
  period,
  isLoading,
}: {
  label: string;
  period?: TokenUsagePeriod;
  isLoading: boolean;
}) => {
  const current = getPlanTokenUsage(period);
  const limit = period?.limit ?? 0;
  const limitReached = Boolean(period?.limit_reached);
  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const isHigh = limitReached || pct >= 80;

  if (isLoading) {
    return (
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-text-muted text-[11px] font-semibold">
          {label}
        </span>
        <span
          className={cn(
            "text-[10px] font-semibold tabular-nums",
            isHigh ? "text-red-600" : "text-text-muted",
          )}
        >
          {limit > 0
            ? `${formatCompactTokens(current)} / ${formatCompactTokens(limit)}`
            : "Unlimited"}
        </span>
      </div>
      {limit > 0 && (
        <div className="bg-bg-main h-1.5 overflow-hidden rounded-full">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isHigh ? "bg-red-500" : "bg-primary",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
};

const TransactionsTable = ({
  transactions,
  isLoading,
}: {
  transactions: BillingTransaction[];
  isLoading: boolean;
}) => {
  const list = transactions ?? [];
  const { data: usdRate } = useUsdRate();

  return (
    <section className="border-border-subtle bg-bg-card overflow-hidden rounded-xl border shadow-sm">
      <div className="border-border-subtle flex shrink-0 items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary flex h-6 w-6 items-center justify-center rounded-lg">
            <Receipt size={13} />
          </div>
          <div>
            <h3 className="text-text-main text-[13px] leading-tight font-semibold">
              Transactions
            </h3>
          </div>
        </div>
        {list.length > 0 && (
          <span className="border-border-subtle text-text-muted rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
            {list.length} total
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <div className="bg-bg-sidebar/60 border-border-subtle text-text-muted grid min-w-[680px] shrink-0 grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-3 border-b px-5 py-3 text-[11px] font-semibold tracking-wider uppercase">
          <span>Amount</span>
          <span>Type</span>
          <span>Date</span>
          <span>Status</span>
          <span />
        </div>

        {isLoading ? (
          <div className="space-y-1 px-5 py-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
            <div className="bg-bg-sidebar/60 border-border-subtle mb-3 flex h-11 w-11 items-center justify-center rounded-lg border">
              <Inbox size={18} className="text-text-muted/70" />
            </div>
            <p className="text-text-main text-sm font-semibold">
              No transactions found
            </p>
            <p className="text-text-muted mt-1 text-xs">
              Your billing activity will appear here.
            </p>
          </div>
        ) : (
          list.map((t) => {
            const status = (t.payment_status ?? "").toLowerCase();
            const type = t.transaction_type ?? "Top up";
            const code = (t.currency?.code || "UZS").toLowerCase();
            const amountUsd =
              code === "uzs" ? uzsToUsd(t.amount, usdRate) : null;
            return (
              <div
                key={t.id}
                className="border-border-subtle hover:bg-hover-bg/50 text-text-main grid min-w-[680px] grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-3 border-b px-5 py-3 text-[12px] transition-colors last:border-b-0"
              >
                <span>
                  {amountUsd != null ? (
                    <>
                      {formatUsd(amountUsd)}{" "}
                      <span className="text-text-muted text-[11px]">
                        ≈ {formatAmount(t.amount)} {code}
                      </span>
                    </>
                  ) : (
                    <>
                      {formatAmount(t.amount)} {code}
                    </>
                  )}
                </span>
                <span>{type}</span>
                <span>{formatTransactionDate(t.created_at)}</span>
                <span
                  className={cn(
                    "w-max rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                    status === "accepted" && "bg-green-500/10 text-green-600",
                    status === "pending" && "bg-amber-500/10 text-amber-600",
                    (status === "cancelled" || status === "failed") &&
                      "bg-red-500/10 text-red-600",
                  )}
                >
                  {t.payment_status || "—"}
                </span>
                <span />
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
