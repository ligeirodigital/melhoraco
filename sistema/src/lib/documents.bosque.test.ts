import { describe, it, expect } from "vitest";
import { availableReceipts, receiptAmount, receiptWarning } from "./documents";

// Pedido do Condomínio Bosque das Damas: sinal de 1.500 pago, saldo pago em 07/11.
const quote: any = {
  id: "e7f5106a-7b3e-40be-a7d1-38d646af19c4",
  down_payment: 1500, remaining_balance: 1491, discount_amount: 0, delivery_fee: 0, installation_fee: 200,
  installation_required: true, installation_value: 200,
  items: [{ quantity: 1, unit_price: 2791 }],
  down_payment_paid_at: "2026-10-20T03:00:00Z", final_payment_paid_at: "2026-11-07T03:00:00Z",
};

describe("recibos de pedido com sinal", () => {
  it("oferece sinal, saldo restante e quitação", () => {
    expect(availableReceipts(quote)).toEqual(["down_payment", "remaining_balance", "full"]);
  });
  it("recibo do saldo (2/2) sai com o valor restante e sem aviso", () => {
    expect(receiptAmount(quote, "down_payment")).toBe(1500);
    expect(receiptAmount(quote, "remaining_balance")).toBe(receiptAmount(quote, "full") - 1500);
    expect(receiptWarning(quote, "remaining_balance")).toBeNull();
  });
});
