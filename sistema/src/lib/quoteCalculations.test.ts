import { describe, it, expect } from "vitest";
import {
  computeQuoteTotals,
  groupDocumentItems,
  resolveItemName,
  roundMoney,
} from "./quoteCalculations";

const item = (over: any = {}) => ({
  product_name: "Produto",
  quantity: 1,
  unit_price: 1000,
  ...over,
});

describe("computeQuoteTotals", () => {
  it("sem desconto", () => {
    const t = computeQuoteTotals({ items: [item()] });
    expect(t.subtotal).toBe(1000);
    expect(t.discountAmountCalculated).toBe(0);
    expect(t.total).toBe(1000);
  });

  it("desconto fixo", () => {
    const t = computeQuoteTotals({
      items: [item()],
      discount_type: "fixed",
      discount_amount: 100,
    });
    expect(t.discountAmountCalculated).toBe(100);
    expect(t.total).toBe(900);
  });

  it("desconto percentual (10% de 1000 = 100)", () => {
    const t = computeQuoteTotals({
      items: [item()],
      discount_type: "percent",
      discount_amount: 10,
    });
    expect(t.discountAmountCalculated).toBe(100);
    expect(t.total).toBe(900);
  });

  it("percentual com valor não redondo arredonda corretamente", () => {
    const t = computeQuoteTotals({
      items: [item({ unit_price: 1237.5 })],
      discount_type: "percent",
      discount_amount: 7,
    });
    expect(t.discountAmountCalculated).toBe(86.63); // 86.625 → 86.63
    expect(t.total).toBe(1150.87);
  });

  it("frete e instalação entram na base antes do desconto", () => {
    const t = computeQuoteTotals({
      items: [item()],
      delivery_fee: 50,
      installation_fee: 150,
      discount_type: "percent",
      discount_amount: 10,
    });
    expect(t.shippingAmount).toBe(200);
    expect(t.discountAmountCalculated).toBe(120);
    expect(t.total).toBe(1080);
  });

  it("entrada e saldo restante", () => {
    const t = computeQuoteTotals({
      items: [item()],
      down_payment: 400,
      remaining_balance: null,
    });
    expect(t.total).toBe(1000);
    expect(t.downPayment).toBe(400);
    expect(t.remainingBalance).toBe(600);
  });

  it("dados inválidos não geram NaN nem total negativo", () => {
    const t = computeQuoteTotals({
      items: [item({ unit_price: undefined, quantity: null })],
      discount_type: "percent",
      discount_amount: 500,
    } as any);
    expect(t.subtotal).toBe(0);
    expect(Number.isNaN(t.total)).toBe(false);
    expect(t.total).toBe(0);

    const t2 = computeQuoteTotals({
      items: [item()],
      discount_type: "fixed",
      discount_amount: 5000,
    });
    expect(t2.total).toBe(0);
  });

  it("roundMoney evita erro de ponto flutuante", () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
  });
});

describe("base do desconto percentual (regra do QuoteForm)", () => {
  it("10% incide sobre produtos + entrega + instalação", () => {
    const t = computeQuoteTotals({
      items: [item({ unit_price: 1000 })],
      delivery_fee: 100,
      installation_fee: 200,
      discount_type: "percent",
      discount_amount: 10,
    });
    expect(t.subtotal).toBe(1000);
    expect(t.shippingAmount).toBe(300);
    // base = 1300 → 10% = 130 (e NÃO 100, que seria só sobre o subtotal)
    expect(t.discountAmountCalculated).toBe(130);
    expect(t.total).toBe(1170);
  });
});

describe("remainingBalance", () => {
  it("com entrada informada, saldo é derivado (ignora persistido defasado)", () => {
    const t = computeQuoteTotals({
      items: [item({ unit_price: 1000 })],
      down_payment: 400,
      remaining_balance: 900, // snapshot antigo/incorreto
    });
    expect(t.remainingBalance).toBe(600);
  });

  it("sem entrada, usa saldo persistido histórico", () => {
    const t = computeQuoteTotals({
      items: [item({ unit_price: 1000 })],
      remaining_balance: 750,
    });
    expect(t.remainingBalance).toBe(750);
  });
});

describe("groupDocumentItems", () => {
  it("mesmo produto + mesma variante + mesmo preço → agrupa", () => {
    const groups = groupDocumentItems([
      item({ product_name: "Placa", product_id: "p1", variant_id: "v1", unit_price: 100 }),
      item({ product_name: "Placa", product_id: "p1", variant_id: "v1", unit_price: 100 }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].quantity).toBe(2);
    expect(groups[0].totalPrice).toBe(200);
  });

  it("mesmo produto + variante diferente + mesmo preço → NÃO agrupa", () => {
    const groups = groupDocumentItems([
      item({ product_name: "Número 15cm (1)", product_id: "p1", variant_id: "v1", unit_price: 15 }),
      item({ product_name: "Número 15cm (5)", product_id: "p1", variant_id: "v2", unit_price: 15 }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it("mesmo produto + mesma variante + preço diferente → NÃO agrupa", () => {
    const groups = groupDocumentItems([
      item({ product_name: "Placa", product_id: "p1", variant_id: "v1", unit_price: 100 }),
      item({ product_name: "Placa", product_id: "p1", variant_id: "v1", unit_price: 120 }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it("mesmo produto + acabamento/especificação diferente → NÃO agrupa", () => {
    const groups = groupDocumentItems([
      item({ product_name: "Placa (Escovado)", product_id: "p1", unit_price: 100 }),
      item({ product_name: "Placa (Polido)", product_id: "p1", unit_price: 100 }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it("não agrupa itens com desconto individual diferente", () => {
    const groups = groupDocumentItems([
      item({ product_name: "Placa", unit_price: 100, unit_discount: 0 }),
      item({ product_name: "Placa", unit_price: 100, unit_discount: 10 }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it("diferença apenas de custo interno → agrupa e não vaza custo", () => {
    const groups = groupDocumentItems([
      item({ product_name: "Placa", unit_price: 100, fixed_cost: 10 } as any),
      item({ product_name: "Placa", unit_price: 100, fixed_cost: 90 } as any),
    ]);
    expect(groups).toHaveLength(1);
    const dump = JSON.stringify(groups[0]);
    expect(dump).not.toContain("fixed_cost");
    expect(dump).not.toContain("_key");
    expect(dump).not.toContain("90");
  });
});


describe("resolveItemName", () => {
  it("usa product_name quando existe", () => {
    expect(resolveItemName({ product_name: "Caixa", products: { name: "X" } })).toBe("Caixa");
  });
  it("cai para products.name", () => {
    expect(resolveItemName({ product_name: "  ", products: { name: "Caixa de correio" } })).toBe(
      "Caixa de correio"
    );
  });
  it("cai para descrição e depois para Item", () => {
    expect(resolveItemName({ products: { description: "Peça inox" } })).toBe("Peça inox");
    expect(resolveItemName({})).toBe("Item");
  });
});
