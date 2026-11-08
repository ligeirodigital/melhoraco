/**
 * Query keys centralizadas para as leituras migradas para TanStack Query.
 * Manter a mesma chave para o mesmo dataset evita fetch duplicado entre telas.
 */
export const queryKeys = {
  publicClientOrders: (phone: string) => ["public-client-orders", phone] as const,
  publicOrder: (quoteId: string) => ["public-order", quoteId] as const,
  quotePaymentTx: (quoteId: string) => ["quote-payment-tx", quoteId] as const,
  quoteReceivables: (quoteId: string) => ["quote-receivables", quoteId] as const,
  receivables: (userId?: string) => ["receivables", userId] as const,
};

/** Intervalos padrão de polling (ms). Não reduzir sem necessidade de produto. */
export const POLL = {
  orders: 12_000,
  order: 20_000,
  payment: 20_000,
} as const;

/** Um pedido é final quando não há mais transição de status esperada. */
export function isOrderFinal(o: { status?: string | null; payment_status?: string | null }) {
  if (o.payment_status === "paid") return true;
  return ["recusado", "cancelado", "entregue", "concluido", "concluído"].includes(
    (o.status ?? "").toLowerCase(),
  );
}
