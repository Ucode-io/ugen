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
} from "lucide-react";
import { format } from "date-fns";
import { Button, Skeleton } from "@/shared/ui";
import { cn } from "@/shared/lib/utils/cn";
import { useAuthStore } from "@/entities/session";
import {
  useCompanyProjectsList,
  useFare,
  useTransactions,
  type BillingTransaction,
} from "@/entities/billing";
import { UpgradePlanDialog } from "./upgrade-plan-dialog";
import { TopUpModal, formatAmount } from "./top-up-modal";

const formatTransactionDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "dd.MM.yyyy, HH:mm");
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
    companyId,
    projectId,
  );
  const { data: fare, isLoading: fareLoading } = useFare(fareId, projectId);
  const { data: transactions = [], isLoading: transactionsLoading } =
    useTransactions(projectId);

  const currentProject = useMemo(
    () =>
      companyProjects.find((p) => p.project_id === projectId) ??
      companyProjects[0],
    [companyProjects, projectId],
  );

  const currency = (fare?.currency || "uzs").toLowerCase();

  return (
    <div className="space-y-4">
      <InvoiceSummaryCard
        balance={currentProject?.balance ?? 0}
        planName={fare?.name}
        totalAmount={fare?.price}
        expireDate={fare?.subscription?.end_date}
        currency={currency}
        isLoading={fareLoading}
        onTopUp={() => setTopUpOpen(true)}
        onUpgrade={() => setUpgradeOpen(true)}
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
  planName,
  totalAmount,
  expireDate,
  currency,
  isLoading,
  onTopUp,
  onUpgrade,
}: {
  balance: number;
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
    {
      icon: CalendarClock,
      label: "Expires",
      value: expireDate ?? "—",
      tone: "bg-emerald-500/10 text-emerald-600",
    },
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
              {formatAmount(balance)}
            </span>
            <span className="text-text-muted text-[11px] font-bold tracking-wider uppercase">
              {currency}
            </span>
          </div>
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

const TransactionsTable = ({
  transactions,
  isLoading,
}: {
  transactions: BillingTransaction[];
  isLoading: boolean;
}) => {
  const list = transactions ?? [];

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
            return (
              <div
                key={t.id}
                className="border-border-subtle hover:bg-hover-bg/50 text-text-main grid min-w-[680px] grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-3 border-b px-5 py-3 text-[12px] transition-colors last:border-b-0"
              >
                <span>
                  {formatAmount(t.amount)}{" "}
                  {(t.currency?.code || "UZS").toLowerCase()}
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
