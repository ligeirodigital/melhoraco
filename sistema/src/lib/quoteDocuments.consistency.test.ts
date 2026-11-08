import { describe, it, expect } from "vitest";
import { computeQuoteTotals, groupDocumentItems } from "./quoteCalculations";
import { getQuoteTotal, formatWhatsApp, formatCurrency } from "./formatQuote";
import type { FullQuote } from "./cloudStore";

/**
 * Comparação de dados normalizados entre os documentos.
 * QuotePDF, ContractPDF, ServiceOrderPDF e ReceiptPDF consomem exatamente
 * computeQuoteTotals()/groupDocumentItems(); WhatsApp consome getQuoteTotal(),
 * que delega para a mesma camada. Comparamos os números que alimentam cada um.
 */
const base = (over: any = {}) =>
  ({
    id: "q1",
    updated_at: new Date().toISOString(),
    client: { name: "Cliente Teste", phone: "11999999999" },
    delivery_address: "Rua X, 123",
    delivery_fee: 0,
    installation_fee: 0,
    discount_amount: 0,
    discount_type: "fixed",
    deadline: "",
    items: [
      { product_id: "p1", product_name: "Placa Inox", unit_price: 1000, quantity: 1 },
    ],
    ...over,
  }) as unknown as FullQuote;

const cases: Array<[string, FullQuote, number]> = [
  ["A - sem desconto", base(), 1000],
  ["B - desconto fixo", base({ discount_type: "fixed", discount_amount: 100 }), 900],
  ["C - desconto percentual", base({ discount_type: "percent", discount_amount: 10 }), 900],
  [
    "D - frete + instalação + desconto",
    base({ delivery_fee: 100, installation_fee: 200, discount_type: "percent", discount_amount: 10 }),
    1170,
  ],
  ["E - entrada parcial", base({ down_payment: 400 }), 1000],
  [
    "F - produtos iguais com variantes diferentes",
    base({
      items: [
        { product_id: "p1", variant_id: "v1", product_name: "Número 15cm (1)", unit_price: 15, quantity: 1 },
        { product_id: "p1", variant_id: "v2", product_name: "Número 15cm (5)", unit_price: 15, quantity: 1 },
      ],
    }),
    30,
  ],
];

describe("consistência de totais entre documentos", () => {
  for (const [name, quote, expected] of cases) {
    it(name, () => {
      const totals = computeQuoteTotals(quote as any);
      expect(totals.total).toBe(expected);
      // WhatsApp / formatQuote
      expect(getQuoteTotal(quote)).toBe(totals.total);
      expect(formatWhatsApp(quote)).toContain(formatCurrency(totals.total));
      // Soma dos grupos usados nos PDFs bate com o subtotal canônico
      const groups = groupDocumentItems(quote.items as any);
      const groupSum = groups.reduce((a, g) => a + g.totalPrice, 0);
      expect(groupSum).toBe(totals.subtotal);
    });
  }

  it("F mantém as duas variantes separadas no documento", () => {
    const groups = groupDocumentItems(cases[5][1].items as any);
    expect(groups).toHaveLength(2);
  });

  it("E imprime o mesmo saldo em recibo e contrato", () => {
    const t = computeQuoteTotals(cases[4][1] as any);
    expect(t.downPayment).toBe(400);
    expect(t.remainingBalance).toBe(600);
  });
});
