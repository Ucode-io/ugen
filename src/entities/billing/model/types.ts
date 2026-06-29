export type CardBrand = "VISA" | "MASTERCARD" | "UZCARD" | "HUMO";

export interface ProjectCard {
  id: string;
  type: CardBrand;
  pan: string;
  expire: string;
  verify?: boolean;
}

export type SubscriptionStatus =
  | "active"
  | "pending_downgrade"
  | (string & {});

export interface Fare {
  id: string;
  name: string;
  price: number;
  currency: string;
  subscription?: {
    id?: string;
    end_date?: string;
    status?: SubscriptionStatus;
    /** Fare the subscription will downgrade to at the end of the period. */
    pending_fare_id?: string;
  };
}

/** Response of GET /v1/subscription/current -- the project's active plan with
 * its billing-period boundaries. */
export interface CurrentSubscription {
  id?: string;
  project_id?: string;
  fare_id?: string;
  status?: SubscriptionStatus;
  /** First day of the current billing period (YYYY-MM-DD). */
  start_date?: string;
  /** Last day of the current billing period (YYYY-MM-DD). */
  end_date?: string;
  /** When the plan renews -- same as end_date for an active subscription. */
  renewal_date?: string;
  /** "paid" | "free". */
  type?: string;
  pending_fare_id?: string;
  billing_period_code?: string;
  billing_period_months?: number;
}

export interface TransactionCurrency {
  code?: string;
}

export interface BillingTransaction {
  id: string;
  amount: number;
  currency?: TransactionCurrency;
  transaction_type?: string;
  payment_status?: string;
  created_at: string;
}

export interface ProjectWithBalance {
  project_id: string;
  title?: string;
  balance?: number;
  fare_id?: string;
  credit_limit?: number;
}

export interface TokenPackCurrency {
  id?: string;
  symbol?: string;
  name?: string;
  code?: string;
}

export interface TokenPack {
  id: string;
  name?: string;
  token_amount?: number;
  price?: number;
  currency_id?: string;
  product_type?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  currency?: TokenPackCurrency;
}

export interface TokenPackWritePayload {
  id?: string;
  name: string;
  token_amount: number;
  price: number;
  currency_id?: string;
  product_type?: "ugen" | "ucode" | (string & {});
  is_active?: boolean;
}

export interface TokenPackBalance {
  company_id?: string;
  remaining_tokens?: number;
}

export interface TokenPackPurchaseResponse {
  company_id?: string;
  tokens_added?: number;
  remaining_tokens?: number;
  charged_amount?: number;
  transaction_id?: string;
}

export type TokenActiveSource = "plan" | "pack" | "exhausted" | (string & {});

export interface TokenUsagePeriod {
  input_tokens?: number;
  output_tokens?: number;
  plan_tokens?: number;
  limit?: number;
  limit_reached?: boolean;
}

export interface CompanyPricingStats {
  tokens?: {
    daily?: TokenUsagePeriod;
    monthly?: TokenUsagePeriod;
    pack_remaining?: number;
    active_source?: TokenActiveSource;
  };
  project_count?: { current?: number; limit?: number };
  builders?: { current?: number; limit?: number };
  user_count?: { current?: number; limit?: number };
}
