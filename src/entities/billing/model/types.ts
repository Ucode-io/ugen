export type CardBrand = "VISA" | "MASTERCARD" | "UZCARD" | "HUMO";

export interface ProjectCard {
  id: string;
  type: CardBrand;
  pan: string;
  expire: string;
  verify?: boolean;
}

export interface Fare {
  id: string;
  name: string;
  price: number;
  currency: string;
  subscription?: {
    end_date?: string;
  };
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
