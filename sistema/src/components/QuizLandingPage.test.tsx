import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { HelmetProvider } from "react-helmet-async";
import { QuizLandingPage } from "./QuizLandingPage";
const { insert, pixel, report, contact } = vi.hoisted(() => ({ insert: vi.fn(), pixel: vi.fn(), report: vi.fn(), contact: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ insert }) } }));
vi.mock("@/lib/metaPixel", () => ({ newEventId: () => "lead-event", trackMetaEvent: pixel }));
vi.mock("@/lib/reportError", () => ({ reportError: report }));
vi.mock("@/hooks/useLandingCatalog", () => ({ useLandingCatalog: () => undefined }));
vi.mock("@/lib/publicTracking", () => ({ trackWhatsAppClick: contact, openTrackedWhatsApp: contact }));
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); vi.spyOn(window, "open").mockImplementation(() => null); });
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
