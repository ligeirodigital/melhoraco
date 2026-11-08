import { describe, it, expect } from "vitest";
import { formatWhatsApp, formatCurrency } from "./formatQuote";
import type { FullQuote } from "./cloudStore";

describe("formatWhatsApp - 4 variações", () => {
  it("keeps historical names and amounts when catalog promotion metadata is present", () => {
    const quote = { client: { name: "Teste" }, items: [{ product_name: "Numeros de casa de inox de 15cm", unit_price: 59, quantity: 2, product: { name: "Números de inox 15 cm", compare_at_price: 90 } }], delivery_fee: 0, installation_fee: 0 } as unknown as FullQuote;
    expect(formatWhatsApp(quote)).toContain("Numeros de casa de inox de 15cm");
    expect(formatWhatsApp(quote)).toContain(formatCurrency(118));
    expect(quote.items[0].unit_price).toBe(59);
  });
  it("inclui cliente, todos os itens (151A) e total corretos", () => {
    const UNIT = 15;
    const chars = ["1", "5", "1", "A"];
    const quote = {
      id: "q1",
      updated_at: new Date().toISOString(),
      client: { name: "João Silva", phone: "11999999999" },
      delivery_address: "Rua X, 123 - Fortaleza",
      delivery_fee: 0,
      installation_fee: 0,
      discount_amount: 0,
      discount_type: "fixed",
      deadline: "",
      items: chars.map((c, i) => ({
        product_id: "p15",
        variant_id: `v${i}`,
        product_name: `Números de casa de inox de 15cm (${c})`,
        unit_price: UNIT,
        quantity: 1,
        fixedCost: 0,
      })),
    } as unknown as FullQuote;

    const text = formatWhatsApp(quote);
    const expectedTotal = UNIT * 4;

    // Cliente
    expect(text).toContain("João Silva");
    // Agrupado: 4x produto base com (151A)
    expect(text).toContain("4x");
    expect(text).toContain("15cm");
    expect(text).toContain("(151A)");
    // Cada caractere preservado no agrupamento
    expect(text).toMatch(/\(151A\)/);
    // Total
    expect(text).toContain(formatCurrency(expectedTotal));
  });
});
