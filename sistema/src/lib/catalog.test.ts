import { describe, expect, it } from "vitest";
import { discountPercent, isSoldOut, orderLabel } from "./catalog";
import { calculateInventoryStats, isProductLowStock } from "./inventory-utils/calculations";

describe("catalog promotion", () => {
  it("calculates the 15 cm promotion from 90 to 59", () => expect(discountPercent(59, 90)).toBe(34));
  it("does not invent a promotion without an older higher price", () => {
    expect(discountPercent(59, null)).toBeNull();
    expect(discountPercent(59, 59)).toBeNull();
    expect(discountPercent(59, 35)).toBeNull();
  });
});
describe("made to order", () => {
  it("allows zero-stock made-to-order products and variants", () => {
    expect(isSoldOut({ made_to_order: true, stock_quantity: 0 })).toBe(false);
    expect(isSoldOut({ made_to_order: true, stock_quantity: 0 }, { stock_quantity: 0 })).toBe(false);
  });
  it("keeps normal zero-stock products unavailable", () => expect(isSoldOut({ made_to_order: false, stock_quantity: 0 })).toBe(true));
  it("keeps face-only stock of 60 available", () => expect(isSoldOut({ made_to_order: false, stock_quantity: 60 })).toBe(false));
  it("does not invent a lead time", () => expect(orderLabel({ made_to_order: true, lead_time_days: null })).toBe("Feito sob encomenda"));
  it("shows the configured lead time", () => expect(orderLabel({ made_to_order: true, lead_time_days: 8 })).toContain("8 dias"));
  it("excludes made-to-order products from low-stock alerts and inventory totals", () => {
    const p = { id: "15", name: "Números de inox 15 cm", made_to_order: true, stock_quantity: 0, variants: [{ id: "v", name: "1", stock_quantity: 0 }] };
    expect(isProductLowStock(p)).toBe(false);
    expect(calculateInventoryStats([p, { id: "face", name: "Só face", stock_quantity: 60, cost: 10 }], []).totalProductStock).toBe(60);
    expect(calculateInventoryStats([p], []).lowStockProducts).toBe(0);
  });
});
