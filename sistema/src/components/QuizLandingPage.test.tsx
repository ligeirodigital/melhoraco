import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { HelmetProvider } from "react-helmet-async";
import { QuizLandingPage } from "./QuizLandingPage";
const { insert, rpc, pixel, report, contact, catalog } = vi.hoisted(() => ({ insert: vi.fn(), rpc: vi.fn(), pixel: vi.fn(), report: vi.fn(), contact: vi.fn(), catalog: { product: undefined as undefined | { id: string; price: number } } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ insert }), rpc } }));
vi.mock("@/lib/metaPixel", () => ({ newEventId: () => "lead-event", trackMetaEvent: pixel }));
vi.mock("@/lib/reportError", () => ({ reportError: report }));
vi.mock("@/hooks/useLandingCatalog", () => ({ useLandingCatalog: () => catalog.product }));
vi.mock("@/lib/appUrl", () => ({ appUrl: () => "https://site.test/sistema" }));
vi.mock("@/lib/publicTracking", () => ({ trackWhatsAppClick: contact, openTrackedWhatsApp: contact }));
beforeEach(() => { vi.clearAllMocks(); catalog.product = undefined; localStorage.clear(); vi.spyOn(window, "open").mockImplementation(() => null); });
function fillQuiz() {
  render(<HelmetProvider><QuizLandingPage data={{ id: "lp-123", title: "Quiz", headline: "Quiz", price: 59, trackingContext: { landing_page_id: "lp-123" } }} /></HelmetProvider>);
  fireEvent.click(screen.getByRole("button", { name: /FAZER MEU ORÇAMENTO/ }));
  fireEvent.click(screen.getByRole("button", { name: /CONTINUAR/ }));
  fireEvent.change(screen.getByPlaceholderText("Ex: João"), { target: { value: "Teste" } });
  fireEvent.change(screen.getByPlaceholderText("(85) 99999-9999"), { target: { value: "85999999999" } });
  fireEvent.change(screen.getByPlaceholderText("Ex: 125 / 340 / 1208"), { target: { value: "123" } });
  fireEvent.click(screen.getByRole("button", { name: /CONTINUAR/ }));
  fireEvent.change(screen.getByPlaceholderText("Nome da rua"), { target: { value: "Rua Teste" } });
  fireEvent.change(screen.getByPlaceholderText("123"), { target: { value: "1" } });
}
it("Lead só dispara depois de salvar e conserva o ID para deduplicação", async () => {
  insert.mockResolvedValue({ error: null }); fillQuiz();
  fireEvent.click(screen.getByRole("button", { name: /FINALIZAR PEDIDO/ }));
  await screen.findByText("Seu orçamento está pronto 🎉");
  expect(insert).toHaveBeenCalledWith(expect.objectContaining({ landing_page_id: "lp-123", event_id: "lead-event", total_value: 59 }));
  expect(pixel).toHaveBeenCalledWith("Lead", expect.objectContaining({ value: 59, currency: "BRL" }), "lead-event");
  expect(insert.mock.invocationCallOrder[0]).toBeLessThan(pixel.mock.invocationCallOrder[0]);
});
it("falha de insert mantém dados e não emite Lead ou Contact", async () => {
  insert.mockResolvedValue({ error: { code: "42501", message: "denied" } }); fillQuiz();
  fireEvent.click(screen.getByRole("button", { name: /FINALIZAR PEDIDO/ }));
  await screen.findByRole("alert");
  expect(report).toHaveBeenCalled(); expect(pixel).not.toHaveBeenCalled(); expect(contact).not.toHaveBeenCalled();
  expect(screen.getByPlaceholderText("Nome da rua")).toHaveValue("Rua Teste");
});
it("cria o orçamento e leva o cliente direto para ele, sem abrir o WhatsApp", async () => {
  catalog.product = { id: "prod-15", price: 59 };
  insert.mockResolvedValue({ error: null });
  rpc.mockResolvedValue({ data: { ok: true, quote_id: "q1", token: "tok" }, error: null });
  const assign = vi.fn();
  const original = window.location;
  Object.defineProperty(window, "location", { configurable: true, value: { ...original, assign, pathname: "/sistema/p/quiz" } });
  try {
    fillQuiz();
    fireEvent.click(screen.getByRole("button", { name: /FINALIZAR PEDIDO/ }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://site.test/sistema/p/q_q1_tok"));
  } finally {
    Object.defineProperty(window, "location", { configurable: true, value: original });
  }
  expect(rpc).toHaveBeenCalledWith("create_public_order", { payload: expect.objectContaining({
    source: "lp",
    customer: expect.objectContaining({ name: "Teste", phone: "85999999999" }),
    items: [{ product_id: "prod-15", quantity: 1 }],
  }) });
  expect(insert.mock.invocationCallOrder[0]).toBeLessThan(rpc.mock.invocationCallOrder[0]);
  expect(window.open).not.toHaveBeenCalled();
  expect(contact).not.toHaveBeenCalled();
});
it("falha ao criar o orçamento não perde o lead nem trava o cliente", async () => {
  catalog.product = { id: "prod-15", price: 59 };
  insert.mockResolvedValue({ error: null });
  rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
  fillQuiz();
  fireEvent.click(screen.getByRole("button", { name: /FINALIZAR PEDIDO/ }));
  await screen.findByText("Seu orçamento está pronto 🎉");
  expect(screen.queryByRole("link", { name: /VER MEU ORÇAMENTO/ })).toBeNull();
  expect(window.open).not.toHaveBeenCalled();
  expect(pixel).toHaveBeenCalledWith("Lead", expect.anything(), "lead-event");
  expect(report).toHaveBeenCalled();
});
