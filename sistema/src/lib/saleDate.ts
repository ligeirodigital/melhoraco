/** Campos mínimos de um orçamento para definir a data da venda. */
export interface SaleDateSource {
  signed_at?: string | null;
  payment_date?: string | null;
  down_payment_paid_at?: string | null;
  final_payment_paid_at?: string | null;
  created_at: string;
}

/**
 * Data da venda: mesma regra usada pela lista de investidores (get_investor_sales).
 * Assinatura, pagamento, ou criação como último recurso.
 */
export function saleDateOf(q: SaleDateSource): Date {
  return new Date(q.signed_at || q.payment_date || q.down_payment_paid_at || q.final_payment_paid_at || q.created_at);
}

/** Números de inox (ex.: "Números de inox 15 cm (6)"), não outros produtos. */
export function isNumberProduct(name: string | null | undefined): boolean {
  return /n[úu]meros?\b/i.test(name || "");
}
