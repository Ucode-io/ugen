"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import {
  Plus,
  CreditCard,
  Wallet,
  Loader2,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Skeleton,
} from "@/shared/ui";
import { cn } from "@/shared/lib/utils/cn";
import {
  useCardDelete,
  useCardList,
  useCardOtpVerify,
  useCardVerify,
  useReceiptPay,
  type CardBrand,
  type ProjectCard,
} from "@/entities/billing";

export const formatAmount = (value: number | undefined | null) =>
  new Intl.NumberFormat("ru-RU").format(Number(value ?? 0));

export const pickErrorMessage = (err: any, fallback: string): string => {
  const payload = err?.response?.data;
  const data = payload?.data;
  if (typeof data === "string" && data.trim()) return data;
  const description = payload?.description;
  if (typeof description === "string" && description.trim()) return description;
  const custom = payload?.custom_message;
  if (typeof custom === "string" && custom.trim()) return custom;
  return fallback;
};

const cardTypeStyles: Record<CardBrand, string> = {
  VISA: "bg-blue-500/10 text-blue-600",
  MASTERCARD: "bg-orange-500/10 text-orange-600",
  UZCARD: "bg-emerald-500/10 text-emerald-600",
  HUMO: "bg-cyan-500/10 text-cyan-600",
};

export const TopUpModal = ({
  open,
  onOpenChange,
  projectId,
  initialAmount,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  /** Pre-fills the amount field (e.g. the shortfall when upgrading). */
  initialAmount?: number;
  /** Fired after a successful top-up, before the modal closes. */
  onSuccess?: () => void;
}) => {
  const [amount, setAmount] = useState("");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<ProjectCard | null>(null);

  const { data: cards = [], isLoading: cardsLoading } = useCardList(
    projectId,
    open,
  );
  const { mutateAsync: receiptPay, isPending: submitting } =
    useReceiptPay(projectId);
  const { mutateAsync: deleteCard, isPending: deletingCard } =
    useCardDelete(projectId);

  const selectedCard = useMemo(
    () => cards.find((c) => c.id === selectedCardId) ?? null,
    [cards, selectedCardId],
  );

  useEffect(() => {
    if (!open) {
      setAmount("");
      setSelectedCardId(null);
    }
  }, [open]);

  // Seed the amount with a suggested value (e.g. the upgrade shortfall) when the
  // modal opens. Runs after the reset effect above, so it wins on open.
  useEffect(() => {
    if (open && initialAmount && initialAmount > 0) {
      setAmount(String(Math.ceil(initialAmount)));
    }
  }, [open, initialAmount]);

  useEffect(() => {
    if (!open || cards.length === 0) return;
    setSelectedCardId((prev) =>
      prev && cards.some((c) => c.id === prev) ? prev : cards[0].id,
    );
  }, [open, cards]);

  const handleAddBalance = async () => {
    if (!selectedCard || !amount) return;
    try {
      await receiptPay({
        project_card_id: selectedCard.id,
        amount: Number(amount),
      });
      toast.success("Transaction successfully created!");
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(pickErrorMessage(err, "Failed to top up balance"));
    }
  };

  const canSubmit =
    Boolean(amount) &&
    Number(amount) > 0 &&
    Boolean(selectedCard) &&
    selectedCard?.verify !== false;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-lg gap-0 overflow-hidden rounded-2xl p-0">
          <div className="border-border-subtle flex items-center gap-3 border-b px-6 py-4">
            <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
              <Wallet size={16} />
            </div>
            <div>
              <DialogTitle className="text-text-main text-[15px] leading-tight font-semibold">
                Top up balance
              </DialogTitle>
              <DialogDescription className="text-text-muted mt-0.5 text-xs">
                Add funds to your account
              </DialogDescription>
            </div>
          </div>

          {cardsLoading ? (
            <div className="space-y-5 p-6">
              <Skeleton className="h-10 w-full" />
              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          ) : cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div className="bg-primary/10 text-primary mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
                <CreditCard size={24} />
              </div>
              <h4 className="text-text-main text-[15px] font-semibold">
                No payment cards yet
              </h4>
              <p className="text-text-muted mt-1.5 max-w-xs text-[12px] leading-relaxed">
                Add a payment card first to top up your balance.
              </p>
              <Button
                onClick={() => setAddCardOpen(true)}
                className="bg-primary hover:bg-primary/90 mt-5 h-9 rounded-lg px-5 text-[13px] font-semibold text-white shadow-sm"
              >
                <Plus size={15} />
                Add card
              </Button>
            </div>
          ) : (
            <div className="space-y-5 p-6">
              <div className="space-y-1.5">
                <label className="text-text-muted text-[12px] font-medium">
                  Amount
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Write amount..."
                    value={amount ? formatAmount(Number(amount)) : ""}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      setAmount(digits);
                    }}
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
                  <div className="bg-bg-sidebar/60 border-border-subtle text-text-muted grid grid-cols-[80px_1fr_100px_60px] gap-3 border-b px-4 py-2.5 text-[11px] font-semibold tracking-wider uppercase">
                    <span>Type</span>
                    <span>Card number</span>
                    <span>Expiry</span>
                    <span className="text-right">Action</span>
                  </div>

                  {cards.map((card) => {
                    const selected = selectedCardId === card.id;
                    return (
                      <div
                        key={card.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedCardId(card.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedCardId(card.id);
                          }
                        }}
                        aria-pressed={selected}
                        className={cn(
                          "border-border-subtle text-text-main relative grid w-full cursor-pointer grid-cols-[80px_1fr_100px_60px] items-center gap-3 border-b px-4 py-3 text-left text-[13px] transition-colors last:border-b-0 focus:outline-none",
                          selected
                            ? "bg-primary/5 ring-primary z-10 rounded-xl ring-1 ring-inset"
                            : "hover:bg-bg-sidebar/50",
                        )}
                      >
                        <span
                          className={cn(
                            "w-max rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide",
                            cardTypeStyles[card.type] ?? cardTypeStyles.VISA,
                          )}
                        >
                          {card.type}
                        </span>
                        <span
                          className={cn(
                            "font-mono",
                            selected && "text-text-main font-semibold",
                          )}
                        >
                          {card.pan}
                        </span>
                        <span className="text-text-muted font-mono">
                          {card.expire}
                        </span>
                        <span className="flex items-center justify-end">
                          <button
                            type="button"
                            aria-label={`Delete card ${card.pan}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCardToDelete(card);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-600"
                          >
                            <Trash2 size={15} />
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="border-border-subtle flex items-center justify-end gap-2 border-t px-6 py-4">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-9 rounded-lg px-4 text-[13px]"
            >
              Cancel
            </Button>
            {!cardsLoading && cards.length > 0 && (
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
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AddCardModal
        open={addCardOpen}
        onOpenChange={setAddCardOpen}
        projectId={projectId}
        onAdded={(card) => setSelectedCardId(card.id)}
      />

      <Dialog
        open={Boolean(cardToDelete)}
        onOpenChange={(o) => !o && !deletingCard && setCardToDelete(null)}
      >
        <DialogContent className="w-full max-w-sm gap-0 overflow-hidden rounded-2xl p-0">
          <div className="flex flex-col items-center px-6 pt-6 pb-2 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
              <Trash2 size={20} />
            </div>
            <DialogTitle className="text-text-main text-[15px] font-semibold">
              Delete this card?
            </DialogTitle>
            <DialogDescription className="text-text-muted mt-1.5 text-[12px] leading-relaxed">
              Are you sure you want to remove{" "}
              <span className="text-text-main font-mono">
                {cardToDelete?.pan}
              </span>{" "}
              from your saved cards? This action cannot be undone.
            </DialogDescription>
          </div>
          <div className="flex items-center justify-end gap-2 px-6 py-4">
            <Button
              variant="ghost"
              disabled={deletingCard}
              onClick={() => setCardToDelete(null)}
              className="h-9 rounded-lg px-4 text-[13px]"
            >
              Cancel
            </Button>
            <Button
              disabled={deletingCard}
              onClick={async () => {
                if (!cardToDelete) return;
                try {
                  await deleteCard(cardToDelete.id);
                  if (selectedCardId === cardToDelete.id) {
                    setSelectedCardId(null);
                  }
                  toast.success("Card removed");
                  setCardToDelete(null);
                } catch (err: any) {
                  toast.error(pickErrorMessage(err, "Failed to delete card"));
                }
              }}
              className="h-9 rounded-lg bg-red-500 px-5 text-[13px] font-medium text-white shadow-sm hover:bg-red-600"
            >
              {deletingCard && <Loader2 size={14} className="mr-2 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const AddCardModal = ({
  open,
  onOpenChange,
  projectId,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  onAdded: (card: { id: string }) => void;
}) => {
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"card" | "otp">("card");
  const [projectCardId, setProjectCardId] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<{
    message: string;
    detail?: string;
  } | null>(null);
  const expiryRef = useRef<HTMLInputElement>(null);
  const lastAttemptRef = useRef<string>("");

  const { mutateAsync: verifyCard, isPending: verifying } =
    useCardVerify(projectId);
  const { mutateAsync: confirmOtp, isPending: confirming } =
    useCardOtpVerify(projectId);

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
  const canVerify = numberDigits.length === 16 && /^\d{2}\/\d{2}$/.test(expiry);
  const verifyKey = `${numberDigits}|${expiry}`;

  const reset = () => {
    setNumber("");
    setExpiry("");
    setOtp("");
    setStage("card");
    setProjectCardId(null);
    setVerifyError(null);
    lastAttemptRef.current = "";
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const handleVerifyCard = async (force = false) => {
    if (!canVerify || verifying) return;
    if (!force && lastAttemptRef.current === verifyKey) return;
    lastAttemptRef.current = verifyKey;
    setVerifyError(null);
    try {
      const res = await verifyCard({ pan: numberDigits, expire: expiry });
      setProjectCardId(res.project_card_id);
      setStage("otp");
    } catch (err: any) {
      const payload = err?.response?.data;
      setVerifyError({
        message: pickErrorMessage(err, "Failed to verify card"),
        detail:
          typeof payload?.custom_message === "string" &&
          payload.custom_message.trim()
            ? payload.custom_message
            : undefined,
      });
    }
  };

  useEffect(() => {
    if (stage !== "card" || !canVerify) return;
    handleVerifyCard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifyKey, stage]);

  const handleConfirmOtp = async (codeOverride?: string) => {
    const code = codeOverride ?? otp;
    if (!projectCardId || code.length < 6) return;
    try {
      await confirmOtp({ code, project_card_id: projectCardId });
      toast.success("The card is successfully added!");
      onAdded({ id: projectCardId });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(pickErrorMessage(err, "Failed to confirm code"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md gap-0 overflow-hidden rounded-2xl p-0">
        <div className="border-border-subtle flex items-center gap-3 border-b px-6 py-4">
          <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
            <CreditCard size={16} />
          </div>
          <div>
            <DialogTitle className="text-text-main text-[15px] leading-tight font-semibold">
              Add card
            </DialogTitle>
            <DialogDescription className="text-text-muted mt-0.5 text-xs">
              {stage === "card"
                ? "Securely save a payment method"
                : "Enter the SMS code to confirm"}
            </DialogDescription>
          </div>
        </div>

        {stage === "card" ? (
          <div className="space-y-4 p-6">
            {verifyError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2"
              >
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-600" />
                <div className="min-w-0">
                  <p className="text-[12px] leading-snug font-medium text-red-600">
                    {verifyError.message}
                  </p>
                  {verifyError.detail && (
                    <p className="mt-0.5 text-[10px] leading-snug text-red-600/70">
                      {verifyError.detail}
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-text-muted text-[12px] font-medium">
                Card number
              </label>
              <Input
                placeholder="1234 5678 9012 3456"
                value={number}
                onChange={(e) => {
                  setVerifyError(null);
                  const next = formatCardNumber(e.target.value);
                  setNumber(next);
                  if (next.replace(/\s/g, "").length === 16) {
                    expiryRef.current?.focus();
                  }
                }}
                className="bg-bg-sidebar border-border-subtle h-10 font-mono text-[13px] tracking-wider"
                inputMode="numeric"
                autoComplete="cc-number"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-text-muted block text-[12px] font-medium">
                Expiry date (MM/YY)
              </label>
              <Input
                ref={expiryRef}
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => {
                  setVerifyError(null);
                  setExpiry(formatExpiry(e.target.value));
                }}
                className="bg-bg-sidebar border-border-subtle h-10 w-32 font-mono text-[13px] tracking-wider"
                inputMode="numeric"
                autoComplete="cc-exp"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-6">
            <label className="text-text-muted block text-[12px] font-medium">
              Verification code
            </label>
            <OtpInput
              value={otp}
              onChange={setOtp}
              length={6}
              autoFocus
              disabled={confirming}
              onComplete={(code) => handleConfirmOtp(code)}
            />
            <p className="text-text-muted text-[11px]">
              A 6-digit code has been sent to the phone number linked to this
              card.
            </p>
          </div>
        )}

        <div className="border-border-subtle flex items-center justify-end gap-2 border-t px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-9 rounded-lg px-4 text-[13px]"
          >
            Cancel
          </Button>
          {stage === "card" ? (
            <Button
              disabled={!canVerify || verifying}
              onClick={() => handleVerifyCard(true)}
              className="bg-primary hover:bg-primary/90 h-9 rounded-lg px-5 text-[13px] font-medium text-white shadow-sm"
            >
              {verifying && <Loader2 size={14} className="mr-2 animate-spin" />}
              {verifyError ? "Retry" : "Add card"}
            </Button>
          ) : (
            <Button
              disabled={otp.length < 6 || confirming}
              onClick={() => handleConfirmOtp()}
              className="bg-primary hover:bg-primary/90 h-9 rounded-lg px-5 text-[13px] font-medium text-white shadow-sm"
            >
              {confirming && <Loader2 size={14} className="mr-2 animate-spin" />}
              Confirm
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const OtpInput = ({
  value,
  onChange,
  length = 6,
  autoFocus,
  disabled,
  onComplete,
}: {
  value: string;
  onChange: (next: string) => void;
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  onComplete?: (code: string) => void;
}) => {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const completedRef = useRef(false);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (value.length === length && !completedRef.current) {
      completedRef.current = true;
      onComplete?.(value);
    } else if (value.length < length) {
      completedRef.current = false;
    }
  }, [value, length, onComplete]);

  const commit = (next: string) => {
    onChange(next.replace(/\D/g, "").slice(0, length));
  };

  const focusAt = (index: number) => {
    const clamped = Math.max(0, Math.min(length - 1, index));
    refs.current[clamped]?.focus();
    refs.current[clamped]?.select();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      commit(value.slice(0, index) + value.slice(index + 1));
      return;
    }
    const merged = value.slice(0, index) + raw + value.slice(index + raw.length);
    const next = merged.replace(/\D/g, "").slice(0, length);
    commit(next);
    focusAt(Math.min(index + raw.length, length - 1));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (value[index]) {
        commit(value.slice(0, index) + value.slice(index + 1));
      } else if (index > 0) {
        commit(value.slice(0, index - 1) + value.slice(index));
        focusAt(index - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusAt(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusAt(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>, index: number) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!text) return;
    e.preventDefault();
    const merged = (value.slice(0, index) + text).slice(0, length);
    commit(merged);
    focusAt(Math.min(merged.length, length - 1));
  };

  return (
    <div className="flex w-full items-center gap-2">
      {Array.from({ length }).map((_, i) => {
        const filled = Boolean(value[i]);
        return (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={value[i] ?? ""}
            disabled={disabled}
            aria-label={`Digit ${i + 1}`}
            onChange={(e) => handleChange(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPaste={(e) => handlePaste(e, i)}
            onFocus={(e) => e.target.select()}
            className={cn(
              "bg-bg-sidebar text-text-main h-14 w-14 min-w-0 flex-1 rounded-xl border text-center font-mono text-[22px] font-semibold transition-all outline-none",
              "focus:border-primary focus:ring-primary focus:ring-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              filled ? "border-primary/50" : "border-border-subtle",
            )}
          />
        );
      })}
    </div>
  );
};
