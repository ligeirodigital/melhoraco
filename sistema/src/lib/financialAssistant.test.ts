import { describe, expect, it } from "vitest";
import { consumeAssistantResponse, validateScenario } from "./financialAssistant";
import { summarizeFinancialRows } from "../../supabase/functions/_shared/financial-context";

describe("Assistente financeiro", () => {
  it("valida a descrição sem descartar espaços internos", () => {
    expect(validateScenario("   ")).toContain("10");
    expect(validateScenario("Preciso pagar fornecedores")).toBeNull();
    expect(validateScenario("a".repeat(4001))).toContain("4.000");
  });
  it("separa provisionado, recebido, vencido e intervalos sem duplicidade", () => {
    const rows = [
      { amount: 250, type: "income", status: "pendente", installment_number: 1, transaction_date: "2026-10-01T15:00:00Z" },
      { amount: 250, type: "income", status: "pendente", installment_number: 2, transaction_date: "2026-10-20T15:00:00Z" },
      { amount: 250, type: "income", status: "pendente", installment_number: 3, transaction_date: "2026-11-20T15:00:00Z" },
      { amount: 250, type: "income", status: "pago", installment_number: 4, transaction_date: "2026-10-10T15:00:00Z" },
      { amount: 1000, type: "income", status: "pago", transaction_date: "2026-10-10T15:00:00Z" },
    ];
    const summary = summarizeFinancialRows(rows, new Date("2026-10-10T15:00:00Z"));
    expect(summary.pending).toBe(750);
    expect(summary.received).toBe(250);
    expect(summary.overdue).toBe(250);
    expect(summary.next30Days).toBe(250);
    expect(summary.days31To60).toBe(250);
  });
  it("não conta cancelados e sinaliza datas ausentes", () => {
    const summary = summarizeFinancialRows([
      { amount: "NaN", type: "income", status: "pendente", installment_number: 1, transaction_date: "bad" },
      { amount: 20, type: "income", status: "cancelado", installment_number: 2, transaction_date: "2026-10-10" },
    ], new Date("2026-10-10T15:00:00Z"));
    expect(summary.pending).toBe(0);
    expect(summary.unknownDates).toBe(1);
    expect(summary.ignoredStatuses).toBe(1);
  });
  it("consome o protocolo nativo e preserva caracteres portugueses", async () => {
    const events = [{ type: "start", messageId: "test" }, { type: "text-start", id: "text" }, { type: "text-delta", id: "text", delta: "Parcelas são previsão." }, { type: "text-end", id: "text" }, { type: "finish" }];
    const response = new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("") + "data: [DONE]\n\n");
    let answer = "";
    await consumeAssistantResponse(response, (text) => { answer = text; });
    expect(answer).toBe("Parcelas são previsão.");
  });
  it("propaga erros terminais e rejeita resposta vazia", async () => {
    await expect(consumeAssistantResponse(new Response('data: {"type":"error","errorText":"Créditos insuficientes"}\n\n'), () => {})).rejects.toThrow("Créditos insuficientes");
    await expect(consumeAssistantResponse(new Response("data: [DONE]\n\n"), () => {})).rejects.toThrow("sem uma análise");
  });
});
