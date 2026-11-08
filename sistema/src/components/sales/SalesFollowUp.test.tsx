import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { FollowUpQueue } from "./FollowUpQueue";
import { UnpaidApprovedQuotes } from "./UnpaidApprovedQuotes";
import { FullQuote } from "@/types/models";
const { mutate, mutateAsync, from, invoke, whatsapp } = vi.hoisted(() => ({ mutate: vi.fn(), mutateAsync: vi.fn(), from: vi.fn(), invoke: vi.fn(), whatsapp: vi.fn((_phone: string | null | undefined, _text: string, _tab?: Window | null) => true) }));
vi.mock("@/hooks/useSalesFollowUp", () => ({ useSalesFollowUp: () => ({ mutate, mutateAsync, isPending: false }) }));
vi.mock("@/lib/whatsappTemplates", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/whatsappTemplates")>(), openWhatsApp: whatsapp }));
vi.mock("@/integrations/supabase/client", () => ({ FN_PREFIX: "melhoraco-", supabase: { from, functions: { invoke } } }));
const quote = { id: "quote-123456", client_id: "client", status: "pendente", payment_status: "pending", created_at: "2026-10-01", order_token: "PORTAL", client: { name: "Ana Silva", phone: "85999999999" }, items: [{ unit_price: 1000, quantity: 1 }], delivery_fee: 0, installation_fee: 0, discount_amount: 0 } as FullQuote;
beforeEach(() => { vi.clearAllMocks(); mutateAsync.mockResolvedValue(undefined); vi.spyOn(window, "open").mockReturnValue(null); });
it("contato reaproveita template e grava o mesmo texto com nome, orçamento e portal", () => {
  render(<MemoryRouter><FollowUpQueue quotes={[quote]} /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Chamar no WhatsApp" }));
  expect(whatsapp).toHaveBeenCalledWith("85999999999", expect.stringContaining("Ana"));
  expect(whatsapp.mock.calls[0]?.[1]).toContain("QUOTE-12");
  expect(whatsapp.mock.calls[0]?.[1]).toContain("/p/PORTAL");
  expect(mutate).toHaveBeenCalledWith({ quote, kind: "contact", text: whatsapp.mock.calls[0]?.[1] });
});
it("abrir/cancelar perda não salva; confirmação é obrigatória", async () => {
  render(<MemoryRouter><FollowUpQueue quotes={[quote]} /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Marcar como perdido" }));
  expect(mutateAsync).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(mutateAsync).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Marcar como perdido" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar perda" }));
  await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ kind: "lost", reason: null })));
});
it("cobrança exibe apenas aprovados pending e Já foi pago aponta ao fluxo existente", () => {
  render(<MemoryRouter><UnpaidApprovedQuotes quotes={[quote, { ...quote, id: "approved", status: "aprovado" }, { ...quote, id: "paid", status: "aprovado", payment_status: "paid", client: { ...quote.client, name: "Pago" } }]} /></MemoryRouter>);
  expect(screen.getAllByRole("button", { name: "Reenviar link de pagamento" })).toHaveLength(1);
  expect(screen.queryByText("Pago")).toBeNull();
  expect(screen.getByRole("link", { name: "Já foi pago" })).toHaveAttribute("href", "/quotes/approved");
});
it("reaproveita checkout pendente sem gerar novo link ou registrar pagamento", async () => {
  const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn().mockResolvedValue({ data: [{ payment_link: "https://checkout.infinitepay.io/test" }], error: null }) };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.order.mockReturnValue(query); from.mockReturnValue(query);
  const approved = { ...quote, status: "aprovado" as const };
  render(<MemoryRouter><UnpaidApprovedQuotes quotes={[approved]} /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Reenviar link de pagamento" }));
  await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ kind: "payment", text: expect.stringContaining("https://checkout.infinitepay.io/test") })));
  expect(invoke).not.toHaveBeenCalled();
});
it("sem link existente usa a função InfinityPay atual e registra somente cobrança", async () => {
  const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn().mockResolvedValue({ data: [], error: null }) };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.order.mockReturnValue(query); from.mockReturnValue(query);
  invoke.mockResolvedValue({ data: { url: "https://checkout.infinitepay.io/new" }, error: null });
  render(<MemoryRouter><UnpaidApprovedQuotes quotes={[{ ...quote, status: "aprovado" }]} /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Reenviar link de pagamento" }));
  await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ kind: "payment", text: expect.stringContaining("https://checkout.infinitepay.io/new") })));
  expect(invoke).toHaveBeenCalledWith("melhoraco-infinitypay-create-link", { body: { quoteId: quote.id, redirectUrl: `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/pedido/${quote.id}/sucesso` } });
});
