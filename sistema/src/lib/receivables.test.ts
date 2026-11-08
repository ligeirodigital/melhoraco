import { describe, expect, it } from "vitest";
import { getBoletoPlan, installmentDueDates, splitInstallmentAmounts } from "@/lib/receivables";

describe("provisionamento de recebíveis", () => {
  it("interpreta boleto parcelado", () => {
    expect(getBoletoPlan("boleto:4x:20d")).toEqual({ installments: 4, intervalDays: 20 });
    expect(getBoletoPlan("cartao_pedido:4x")).toBeNull();
  });

  it("divide R$ 1.000 em quatro parcelas exatas", () => {
    expect(splitInstallmentAmounts(1000, 4)).toEqual([250, 250, 250, 250]);
  });

  it("concentra os centavos restantes na última parcela", () => {
    const values = splitInstallmentAmounts(1000.01, 4);
    expect(values).toEqual([250, 250, 250, 250.01]);
    expect(values.reduce((sum, value) => sum + value, 0)).toBe(1000.01);
  });

  it("gera vencimentos sucessivos pelo intervalo contratado", () => {
    const dates = installmentDueDates(new Date(2026, 8, 24), 4, 20);
    expect(dates.map((date) => date.toISOString().slice(0, 10))).toEqual([
      "2026-10-14",
      "2026-11-03",
      "2026-11-23",
      "2026-12-13",
    ]);
  });
});
