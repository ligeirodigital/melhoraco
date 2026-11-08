import { Tables } from "@/integrations/supabase/types";

export type DbClient = Tables<"clients">;
export type DbProduct = Tables<"products">;
export type DbQuote = Tables<"quotes">;
export type DbQuoteItem = Tables<"quote_items">;

export type QuoteStatus = "pendente" | "aprovado" | "recusado";
export type PaymentStatus = "pending" | "paid" | "expired" | "refunded";

export interface FullQuote extends Omit<DbQuote, 'status' | 'payment_status' | 'payment_date' | 'down_payment_paid_at' | 'final_payment_paid_at' | 'payment_method_type' | 'down_payment' | 'remaining_balance'> {
  status: QuoteStatus;
  payment_status: PaymentStatus | string | null;
  payment_method_type?: string | null;
  payment_date?: string | null;
  down_payment_paid_at?: string | null;
  final_payment_paid_at?: string | null;
  down_payment: number;
  remaining_balance: number;
  client: DbClient;
  items: (DbQuoteItem & { product?: DbProduct | null })[];
  employee_signature_url?: string | null;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'staff' | 'client';
  signature_url: string | null;
  commission_rate: number;
  created_at: string;
  updated_at: string;
}
