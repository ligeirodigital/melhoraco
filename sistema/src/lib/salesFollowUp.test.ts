import { describe, expect, it } from "vitest";
import { contactDays, contactUrgency, followUpQueue, isFutureReturn, LOST_REASONS } from "./salesFollowUp";
const now = new Date(2026, 9, 11, 16, 37);
const q = (id: string, created_at: string, last_follow_up: string | null = null, next_follow_up_at: string | null = null, status = "pendente") => ({ id, created_at, last_follow_up, next_follow_up_at, status });
describe("Fila de follow-up", () => {
  it("usa último contato quando existe", () => expect(contactDays(q("a", "2026-09-01", "2026-10-09"), now)).toBe(2));
  it("usa criação se nunca houve contato", () => expect(contactDays(q("a", "2026-10-04"), now)).toBe(7));
  it("conta dias de calendário, não períodos de 24h", () => expect(contactDays(q("a", "2026-10-10T23:59:00"), now)).toBe(1));
  it("não apresenta dias negativos ou NaN", () => { expect(contactDays(q("a", "2026-10-12"), now)).toBe(0); expect(contactDays(q("a", "invalid"), now)).toBe(0); });
  it("verde até 2, amarelo de 3 a 6, vermelho a partir de 7", () => {
    expect([0, 1, 2].map(contactUrgency)).toEqual(["success", "success", "success"]);
    expect([3, 4, 5, 6].map(contactUrgency)).toEqual(["warning", "warning", "warning", "warning"]);
    expect([7, 30].map(contactUrgency)).toEqual(["destructive", "destructive"]);
  });
  it("ordena somente pendentes pelo contato mais antigo sem alterar entrada", () => {
    const input = [q("new", "2026-10-10"), q("contact", "2026-09-01", "2026-10-09"), q("old", "2026-10-01"), q("paid", "2026-08-01", null, null, "aprovado")];
    expect(followUpQueue(input, now).map(x => x.id)).toEqual(["old", "contact", "new"]);
    expect(input[0].id).toBe("new");
  });
  it("adia retornos futuros e devolve ao topo no dia marcado", () => {
    const deferred = q("deferred", "2026-08-01", null, "2026-10-12"); const due = q("due", "2026-09-01", null, "2026-10-11"); const active = q("active", "2026-10-01");
    expect(followUpQueue([deferred, active, due], now).map(x => x.id)).toEqual(["due", "active", "deferred"]);
    expect(isFutureReturn(due, now)).toBe(false);
    expect(followUpQueue([active, deferred], new Date(2026, 9, 12)).map(x => x.id)).toEqual(["deferred", "active"]);
  });
  it("oferece exatamente os motivos pedidos", () => expect(LOST_REASONS).toEqual(["preço", "prazo", "sem resposta", "comprou de outro", "outro"]));
});
