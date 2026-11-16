import { describe, it, expect, vi } from "vitest";

// Só regras puras são testadas aqui: o cliente do Supabase não precisa existir.
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { receivedUpTo, summarizePayments, type QuotePayment } from "./quotePayments";
import { toInvestorSale } from "./investorSales";

const pay = (id: string, kind: QuotePayment["kind"], amount: number, paid_at: string): QuotePayment => ({
  id, quote_id: "q1", kind, amount, paid_at, method: null, note: null, created_at: paid_at,
});

const ledger = [
  pay("a", "sinal", 1500, "2026-10-14T15:00:00Z"),
  pay("b", "parcial", 500, "2026-10-20T15:00:00Z"),
  pay("c", "saldo", 991, "2026-11-02T15:00:00Z"),
];

describe("pagamentos do pedido", () => {
  it("soma o recebido e informa o que falta", () => {
    expect(summarizePayments(ledger, 2991)).toEqual({ received: 2991, remaining: 0, paid: true });
    expect(summarizePayments(ledger.slice(0, 2), 2991)).toEqual({ received: 2000, remaining: 991, paid: false });
  });

  it("recibo parcial mostra o recebido até a data daquele pagamento", () => {
    expect(receivedUpTo(ledger, ledger[0])).toBe(1500);
    expect(receivedUpTo(ledger, ledger[1])).toBe(2000);
    expect(receivedUpTo(ledger, ledger[2])).toBe(2991);
  });

  it("investidor vê o pedido parcial e o pedido quitado a partir dos pagamentos", () => {
    const base = {
      id: "q1", sale_date: "2026-10-14T15:00:00Z", client_name: "Bosque", delivery_fee: 0, installation_fee: 0,
      discount_type: "fixed", discount_amount: 0, down_payment: 1500, remaining_balance: 1491,
      payment_status: "pending", down_payment_paid_at: null, final_payment_paid_at: null, payment_date: null,
      items: [{ product_name: "Armário (1)", quantity: 1, unit_price: 2991, unit_discount: null, unit_discount_type: null }],
    };
    const parcial = toInvestorSale({ ...base, payments: [{ kind: "sinal", amount: 1500, paid_at: "2026-10-14T15:00:00Z" }] } as any);
    expect(parcial.payment).toBe("parcial");
    expect(parcial.received).toBe(1500);
    expect(parcial.toReceive).toBe(1491);

    const quitado = toInvestorSale({ ...base, payments: [
      { kind: "sinal", amount: 1500, paid_at: "2026-10-14T15:00:00Z" },
      { kind: "saldo", amount: 1491, paid_at: "2026-11-02T15:00:00Z" },
    ] } as any);
    expect(quitado.payment).toBe("pago");
    expect(quitado.toReceive).toBe(0);
  });
});
