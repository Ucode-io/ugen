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
