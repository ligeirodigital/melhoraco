import { describe, it, expect } from "vitest";
import { isNumberProduct, saleDateOf } from "./saleDate";

describe("data da venda", () => {
  it("usa assinatura, depois pagamento, depois criação", () => {
    const base = { created_at: "2026-09-01T12:00:00Z" };
    expect(saleDateOf({ ...base, signed_at: "2026-10-05T12:00:00Z" }).toISOString()).toBe("2026-10-05T12:00:00.000Z");
    expect(saleDateOf({ ...base, payment_date: "2026-10-07T12:00:00Z" }).toISOString()).toBe("2026-10-07T12:00:00.000Z");
    expect(saleDateOf(base).toISOString()).toBe("2026-09-01T12:00:00.000Z");
  });
});

describe("números de inox", () => {
  it("reconhece números com medida e variante", () => {
    expect(isNumberProduct("Números de inox 15 cm (6)")).toBe(true);
    expect(isNumberProduct("Números de inox 15 cm")).toBe(true);
  });
  it("não confunde outros produtos", () => {
    expect(isNumberProduct("Placa de inox 30x30")).toBe(false);
    expect(isNumberProduct("")).toBe(false);
  });
});
