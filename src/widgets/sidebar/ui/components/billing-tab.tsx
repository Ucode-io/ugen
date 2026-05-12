"use client";

import { useState } from "react";
import {
  Plus,
  CreditCard,
  Wallet,
  Loader2,
  Check,
  Trash2,
  Inbox,
  Sparkles,
  CalendarClock,
  Receipt,
  BadgeCheck,
} from "lucide-react";
import { Button, Input, Dialog, DialogContent } from "@/shared/ui";
import { cn } from "@/shared/lib/utils/cn";

type Card = {
  id: string;
  type: "VISA" | "MASTERCARD" | "UZCARD" | "HUMO";
  number: string;
  expiry: string;
};

type Transaction = {
  id: string;
  project: string;
  amount: number;
  type: "TOP_UP" | "CHARGE";
  date: string;
  status: "PAID" | "PENDING" | "FAILED";
};

const invoiceSummary = {
  balance: 0,
  plan: "Small",
  totalAmount: 3642582,
  expireDate: "2026-12-31",
  currency: "uzs",
};

const formatAmount = (value: number) =>
  new Intl.NumberFormat("ru-RU").format(value);

const detectCardType = (digits: string): Card["type"] => {
  if (digits.startsWith("4")) return "VISA";
  if (digits.startsWith("5")) return "MASTERCARD";
  if (digits.startsWith("8600")) return "UZCARD";
  if (digits.startsWith("9860")) return "HUMO";
  return "VISA";
};

const maskCard = (digits: string) =>
  `•••• •••• •••• ${digits.slice(-4).padStart(4, "•")}`;

const cardTypeStyles: Record<Card["type"], string> = {
  VISA: "bg-blue-500/10 text-blue-600",
  MASTERCARD: "bg-orange-500/10 text-orange-600",
  UZCARD: "bg-emerald-500/10 text-emerald-600",
  HUMO: "bg-cyan-500/10 text-cyan-600",
};

export const BillingTab = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [transactions] = useState<Transaction[]>([]);
  const [topUpOpen, setTopUpOpen] = useState(false);

  return (
    <div className="space-y-4">
      <InvoiceSummaryCard onTopUp={() => setTopUpOpen(true)} />
      <TransactionsTable transactions={transactions} />

      <TopUpModal
        open={topUpOpen}
        onOpenChange={setTopUpOpen}
        cards={cards}
        onCardAdded={(card) => setCards((prev) => [...prev, card])}
        onCardRemoved={(id) =>
          setCards((prev) => prev.filter((c) => c.id !== id))
        }
      />
    </div>
  );
};

const InvoiceSummaryCard = ({ onTopUp }: { onTopUp: () => void }) => {
  const meta = [
    {
      icon: Sparkles,
      label: "Plan",
      value: invoiceSummary.plan,
      tone: "bg-violet-500/10 text-violet-600",
    },
    {
      icon: Receipt,
      label: "Total",
      value: `${formatAmount(invoiceSummary.totalAmount)} ${invoiceSummary.currency}`,
      tone: "bg-amber-500/10 text-amber-600",
    },
    {
      icon: CalendarClock,
      label: "Expires",
      value: invoiceSummary.expireDate,
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
              {formatAmount(invoiceSummary.balance)}
            </span>
            <span className="text-text-muted text-[11px] font-bold tracking-wider uppercase">
              {invoiceSummary.currency}
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
                  <p className="text-text-main mt-1 truncate text-[15px] font-semibold">
                    {value}
                  </p>
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
}: {
  transactions: Transaction[];
}) => {
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
        {transactions.length > 0 && (
          <span className="border-border-subtle text-text-muted rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
            {transactions.length} total
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <div className="bg-bg-sidebar/60 border-border-subtle text-text-muted grid min-w-[680px] shrink-0 grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-3 border-b px-5 py-3 text-[11px] font-semibold tracking-wider uppercase">
          <span>Project</span>
          <span>Amount</span>
          <span>Type</span>
          <span>Date</span>
          <span>Status</span>
        </div>

        {transactions.length === 0 ? (
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
          transactions.map((t) => (
            <div
              key={t.id}
              className="border-border-subtle hover:bg-hover-bg/50 text-text-main grid min-w-[680px] grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-3 border-b px-5 py-3 text-[12px] transition-colors last:border-b-0"
            >
              <span className="truncate font-medium">{t.project}</span>
              <span>{formatAmount(t.amount)} uzs</span>
              <span>{t.type}</span>
              <span>{t.date}</span>
              <span
                className={cn(
                  "w-max rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                  t.status === "PAID" && "bg-green-500/10 text-green-600",
                  t.status === "PENDING" && "bg-amber-500/10 text-amber-600",
                  t.status === "FAILED" && "bg-red-500/10 text-red-600",
                )}
              >
                {t.status}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
};

const TopUpModal = ({
  open,
  onOpenChange,
  cards,
  onCardAdded,
  onCardRemoved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: Card[];
  onCardAdded: (card: Card) => void;
  onCardRemoved: (id: string) => void;
}) => {
  const [amount, setAmount] = useState("");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setAmount("");
    setSelectedCardId(null);
    setSubmitting(false);
  };

  const handleAddBalance = async () => {
    if (!amount || !selectedCardId) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    setSubmitting(false);
    onOpenChange(false);
    reset();
  };

  const canSubmit = Boolean(amount && Number(amount) > 0 && selectedCardId);

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          onOpenChange(o);
          if (!o) reset();
        }}
      >
        <DialogContent className="w-full max-w-lg gap-0 overflow-hidden rounded-2xl p-0">
          <div className="border-border-subtle flex items-center gap-3 border-b px-6 py-4">
            <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
              <Wallet size={16} />
            </div>
            <div>
              <h3 className="text-text-main text-[15px] leading-tight font-semibold">
                Top up balance
              </h3>
              <p className="text-text-muted mt-0.5 text-xs">
                Add funds to your account
              </p>
            </div>
          </div>

          <div className="space-y-5 p-6">
            <div className="space-y-1.5">
              <label className="text-text-muted text-[12px] font-medium">
                Amount
              </label>
              <div className="relative">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Write amount..."
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-bg-sidebar border-border-subtle h-10 pr-14 text-[13px]"
                />
                <span className="text-text-muted absolute top-1/2 right-3 -translate-y-1/2 text-[11px] font-semibold tracking-wider uppercase">
                  uzs
                </span>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-text-muted text-[12px] font-medium">
                  Choose card for top up
                </label>
                <button
                  type="button"
                  onClick={() => setAddCardOpen(true)}
                  className="text-primary flex items-center gap-1.5 text-[12px] font-semibold hover:underline"
                >
                  <CreditCard size={13} />
                  Add card
                </button>
              </div>

              <div className="bg-bg-card border-border-subtle overflow-hidden rounded-xl border">
                <div className="bg-bg-sidebar/60 border-border-subtle text-text-muted grid grid-cols-[80px_1fr_120px_40px] gap-3 border-b px-4 py-2.5 text-[11px] font-semibold tracking-wider uppercase">
                  <span>Type</span>
                  <span>Card number</span>
                  <span>Expiry date</span>
                  <span />
                </div>

                {cards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-4 py-10">
                    <CreditCard size={22} className="text-text-muted/40 mb-2" />
                    <p className="text-text-muted text-xs">
                      No cards added yet
                    </p>
                    <button
                      onClick={() => setAddCardOpen(true)}
                      className="text-primary mt-2 text-[12px] font-semibold hover:underline"
                    >
                      Add your first card
                    </button>
                  </div>
                ) : (
                  cards.map((card) => {
                    const selected = selectedCardId === card.id;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => setSelectedCardId(card.id)}
                        className={cn(
                          "border-border-subtle text-text-main grid w-full grid-cols-[80px_1fr_120px_40px] items-center gap-3 border-b px-4 py-3 text-left text-[13px] transition-colors last:border-b-0",
                          selected ? "bg-primary/5" : "hover:bg-bg-sidebar/50",
                        )}
                      >
                        <span
                          className={cn(
                            "w-max rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide",
                            cardTypeStyles[card.type],
                          )}
                        >
                          {card.type}
                        </span>
                        <span className="font-mono">
                          {maskCard(card.number)}
                        </span>
                        <span className="text-text-muted font-mono">
                          {card.expiry}
                        </span>
                        <span className="flex items-center justify-end gap-1">
                          {selected ? (
                            <span className="bg-primary flex h-5 w-5 items-center justify-center rounded-full text-white">
                              <Check size={12} />
                            </span>
                          ) : (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                onCardRemoved(card.id);
                              }}
                              className="text-text-muted hover:text-destructive hover:bg-destructive/10 flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                            >
                              <Trash2 size={13} />
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="border-border-subtle flex items-center justify-end gap-2 border-t px-6 py-4">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-9 rounded-lg px-4 text-[13px]"
            >
              Cancel
            </Button>
            <Button
              disabled={!canSubmit || submitting}
              onClick={handleAddBalance}
              className="bg-primary hover:bg-primary/90 h-9 rounded-lg px-5 text-[13px] font-medium text-white shadow-sm"
            >
              {submitting && (
                <Loader2 size={14} className="mr-2 animate-spin" />
              )}
              Add balance
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AddCardModal
        open={addCardOpen}
        onOpenChange={setAddCardOpen}
        onAdd={(card) => {
          onCardAdded(card);
          setSelectedCardId(card.id);
        }}
      />
    </>
  );
};

const AddCardModal = ({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (card: Card) => void;
}) => {
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setNumber("");
    setExpiry("");
    setSubmitting(false);
  };

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const numberDigits = number.replace(/\s/g, "");
  const canSubmit = numberDigits.length === 16 && /^\d{2}\/\d{2}$/.test(expiry);

  const handleAdd = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 500));
    onAdd({
      id: crypto.randomUUID(),
      type: detectCardType(numberDigits),
      number: numberDigits,
      expiry,
    });
    setSubmitting(false);
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="w-full max-w-md gap-0 overflow-hidden rounded-2xl p-0">
        <div className="border-border-subtle flex items-center gap-3 border-b px-6 py-4">
          <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
            <CreditCard size={16} />
          </div>
          <div>
            <h3 className="text-text-main text-[15px] leading-tight font-semibold">
              Add card
            </h3>
            <p className="text-text-muted mt-0.5 text-xs">
              Securely save a payment method
            </p>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <div className="space-y-1.5">
            <label className="text-text-muted text-[12px] font-medium">
              Card number
            </label>
            <Input
              placeholder="1234 5678 9012 3456"
              value={number}
              onChange={(e) => setNumber(formatCardNumber(e.target.value))}
              className="bg-bg-sidebar border-border-subtle h-10 font-mono text-[13px] tracking-wider"
              inputMode="numeric"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-text-muted text-[12px] font-medium">
              Expiry date (MM/YY)
            </label>
            <Input
              placeholder="MM/YY"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              className="bg-bg-sidebar border-border-subtle h-10 w-40 font-mono text-[13px] tracking-wider"
              inputMode="numeric"
            />
          </div>
        </div>

        <div className="border-border-subtle flex items-center justify-end gap-2 border-t px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-9 rounded-lg px-4 text-[13px]"
          >
            Cancel
          </Button>
          <Button
            disabled={!canSubmit || submitting}
            onClick={handleAdd}
            className="bg-primary hover:bg-primary/90 h-9 rounded-lg px-5 text-[13px] font-medium text-white shadow-sm"
          >
            {submitting && <Loader2 size={14} className="mr-2 animate-spin" />}
            Add card
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
