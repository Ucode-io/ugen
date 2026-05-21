import { create } from "zustand";

// Known codes get tailored copy + autocomplete. The backend defines limit
// codes in several services, so the union stays open (`string & {}`) — any
// unknown code still surfaces a generic popup instead of silently failing.
export type KnownBillingLimitCode =
  | "project_limit"
  | "table_limit"
  | "asset_limit"
  | "database_limit"
  | "api_call_limit"
  | "api_key_limit"
  | "function_limit"
  | "microfrontend_limit"
  | "user_limit"
  | "token_day_limit"
  | "token_month_limit";

export type BillingLimitCode = KnownBillingLimitCode | (string & {});

export interface PaymentRequiredData {
  type: "payment_required";
  code: BillingLimitCode;
  unit?: string;
  // token limits only
  period?: "day" | "month";
  used?: number;
  limit?: number;
  day_used?: number;
  day_limit?: number;
  month_used?: number;
  month_limit?: number;
}

interface BillingLimitState {
  open: boolean;
  data: PaymentRequiredData | null;
  openLimit: (data: PaymentRequiredData) => void;
  close: () => void;
}

export const useBillingLimitStore = create<BillingLimitState>((set) => ({
  open: false,
  data: null,
  openLimit: (data) => set({ open: true, data }),
  close: () => set({ open: false }),
}));

/** Narrows an unknown payload to PaymentRequiredData. */
export const isPaymentRequiredData = (
  value: any,
): value is PaymentRequiredData =>
  !!value && typeof value === "object" && value.type === "payment_required";

/**
 * Extracts a PaymentRequiredData payload from a thrown axios error (HTTP 402),
 * or null if the error isn't a billing-limit error. Used by GET queries that
 * want to render an inline "limit reached" state instead of the global popup.
 */
export const getPaymentRequiredFromError = (
  error: any,
): PaymentRequiredData | null => {
  if (error?.response?.status !== 402) return null;
  const data = error.response.data?.data;
  return isPaymentRequiredData(data) ? data : null;
};

/**
 * Central handler. Opens the global billing-limit dialog for any
 * payment_required payload — shared by the axios 402 interceptor and the
 * AI chat SSE error handler.
 */
export const handlePaymentRequired = (data: unknown): boolean => {
  if (!isPaymentRequiredData(data)) return false;
  useBillingLimitStore.getState().openLimit(data);
  return true;
};
