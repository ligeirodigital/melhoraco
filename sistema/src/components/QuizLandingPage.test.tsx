import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { HelmetProvider } from "react-helmet-async";
import { QuizLandingPage } from "./QuizLandingPage";
const { insert, rpc, pixel, report, contact, catalog } = vi.hoisted(() => ({ insert: vi.fn(), rpc: vi.fn(), pixel: vi.fn(), report: vi.fn(), contact: vi.fn(), catalog: { product: undefined as undefined | { id: string; price: number }, fetched: undefined as undefined | { id: string; price: number }, sizes: [] as { id: string; name: string; price: number }[] } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ insert }), rpc } }));
vi.mock("@/lib/metaPixel", () => ({ newEventId: () => "lead-event", trackMetaEvent: pixel }));
vi.mock("@/lib/reportError", () => ({ reportError: report }));
vi.mock("@/hooks/useLandingCatalog", () => ({ useLandingCatalog: () => catalog.product, useLandingSizes: () => catalog.sizes, fetchLandingProduct: async () => catalog.fetched }));
vi.mock("@/lib/appUrl", () => ({ appUrl: () => "https://site.test/sistema" }));
vi.mock("@/lib/publicTracking", () => ({ trackWhatsAppClick: contact, openTrackedWhatsApp: contact }));
beforeEach(() => { vi.clearAllMocks(); catalog.product = undefined; catalog.fetched = undefined; catalog.sizes = []; localStorage.clear(); vi.spyOn(window, "open").mockImplementation(() => null); });
function fillQuiz() {
  render(<HelmetProvider><QuizLandingPage data={{ id: "lp-123", title: "Quiz", headline: "Quiz", price: 59, trackingContext: { landing_page_id: "lp-123" } }} /></HelmetProvider>);
  fireEvent.click(screen.getAllByRole("button", { name: /FAZER MEU ORÇAMENTO/ })[0]);
  fireEvent.change(screen.getByPlaceholderText("Ex: 1208"), { target: { value: "123" } });
  fireEvent.click(screen.getByRole("button", { name: /CONTINUAR/ }));
  fireEvent.change(screen.getByPlaceholderText("Ex: João"), { target: { value: "Teste" } });
  fireEvent.change(screen.getByPlaceholderText("(85) 99999-9999"), { target: { value: "85999999999" } });
}
it("Lead só dispara depois de salvar e conserva o ID para deduplicação", async () => {
  insert.mockResolvedValue({ error: null }); fillQuiz();
  fireEvent.click(screen.getByRole("button", { name: /VER MEU ORÇAMENTO/ }));
  await screen.findByText("Seu orçamento está pronto 🎉");
  expect(insert).toHaveBeenCalledWith(expect.objectContaining({ landing_page_id: "lp-123", event_id: "lead-event", quantity: 3, total_value: 177, desired_number: "123" }));
  expect(pixel).toHaveBeenCalledWith("Lead", expect.objectContaining({ value: 177, currency: "BRL", num_items: 3 }), "lead-event");
  expect(insert.mock.invocationCallOrder[0]).toBeLessThan(pixel.mock.invocationCallOrder[0]);
});
it("falha de insert mantém dados e não emite Lead ou Contact", async () => {
  insert.mockResolvedValue({ error: { code: "42501", message: "denied" } }); fillQuiz();
  fireEvent.click(screen.getByRole("button", { name: /VER MEU ORÇAMENTO/ }));
  await screen.findByRole("alert");
  expect(report).toHaveBeenCalled(); expect(pixel).not.toHaveBeenCalled(); expect(contact).not.toHaveBeenCalled();
  expect(screen.getByPlaceholderText("Ex: João")).toHaveValue("Teste");
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
    fireEvent.click(screen.getByRole("button", { name: /VER MEU ORÇAMENTO/ }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://site.test/sistema/p/q_q1_tok"));
  } finally {
    Object.defineProperty(window, "location", { configurable: true, value: original });
  }
  expect(rpc).toHaveBeenCalledWith("create_public_order", { payload: expect.objectContaining({
    source: "lp",
    customer: expect.objectContaining({ name: "Teste", phone: "85999999999" }),
    items: [{ product_id: "prod-15", quantity: 3 }],
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
  fireEvent.click(screen.getByRole("button", { name: /VER MEU ORÇAMENTO/ }));
  await screen.findByText("Seu orçamento está pronto 🎉");
  expect(screen.queryByRole("link", { name: /VER MEU ORÇAMENTO/ })).toBeNull();
  expect(window.open).not.toHaveBeenCalled();
  expect(pixel).toHaveBeenCalledWith("Lead", expect.anything(), "lead-event");
  expect(report).toHaveBeenCalled();
});
it("número da casa define a quantidade e o preço antes dos dados pessoais", () => {
  render(<HelmetProvider><QuizLandingPage data={{ id: "lp-123", title: "Quiz", headline: "Quiz", price: 59 }} /></HelmetProvider>);
  fireEvent.click(screen.getAllByRole("button", { name: /FAZER MEU ORÇAMENTO/ })[0]);
  expect(screen.getByRole("button", { name: /CONTINUAR/ })).toBeDisabled();
  fireEvent.change(screen.getByPlaceholderText("Ex: 1208"), { target: { value: "125 / 340" } });
  expect(screen.getByText(/6 dígitos/)).toBeInTheDocument();
  expect(screen.getByText(/354,00/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /CONTINUAR/ })).toBeEnabled();
  expect(screen.queryByText(/PROMOÇÃO EXPIRA/)).toBeNull();
});
it("cria o orçamento mesmo quando o catálogo ainda não tinha carregado", async () => {
  catalog.fetched = { id: "prod-15", price: 59 };
  insert.mockResolvedValue({ error: null });
  rpc.mockResolvedValue({ data: { ok: true, quote_id: "q2", token: "t2" }, error: null });
  const assign = vi.fn();
  const original = window.location;
  Object.defineProperty(window, "location", { configurable: true, value: { ...original, assign, pathname: "/sistema/p/quiz" } });
  try {
    fillQuiz();
    fireEvent.click(screen.getByRole("button", { name: /VER MEU ORÇAMENTO/ }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://site.test/sistema/p/q_q2_t2"));
  } finally {
    Object.defineProperty(window, "location", { configurable: true, value: original });
  }
  expect(rpc).toHaveBeenCalledWith("create_public_order", { payload: expect.objectContaining({ items: [{ product_id: "prod-15", quantity: 3 }] }) });
});
it("cliente escolhe o tamanho e o orçamento sai com o produto e o preço dele", async () => {
  const p15 = { id: "p15", name: "Números de inox 15 cm", price: 59 };
  const p20 = { id: "p20", name: "Números de inox 20 cm", price: 120 };
  const p30 = { id: "p30", name: "Números de inox 30 cm", price: 180 };
  catalog.product = p15; catalog.sizes = [p15, p20, p30];
  insert.mockResolvedValue({ error: null });
  rpc.mockResolvedValue({ data: { ok: true, quote_id: "q3", token: "t3" }, error: null });
  const assign = vi.fn();
  const original = window.location;
  Object.defineProperty(window, "location", { configurable: true, value: { ...original, assign, pathname: "/sistema/p/quiz" } });
  try {
    render(<HelmetProvider><QuizLandingPage data={{ id: "lp-123", title: "Números em Aço Inox 15cm", headline: "Quiz", price: 59 }} /></HelmetProvider>);
    fireEvent.click(screen.getAllByRole("button", { name: /FAZER MEU ORÇAMENTO/ })[0]);
    expect(screen.getByRole("radio", { name: /15 cm/ })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: /20 cm/ }));
    fireEvent.change(screen.getByPlaceholderText("Ex: 1208"), { target: { value: "12" } });
    expect(screen.getByText(/240,00/)).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /preto/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /CONTINUAR/ }));
    fireEvent.change(screen.getByPlaceholderText("Ex: João"), { target: { value: "Ana" } });
    fireEvent.change(screen.getByPlaceholderText("(85) 99999-9999"), { target: { value: "85988887777" } });
    fireEvent.click(screen.getByRole("button", { name: /VER MEU ORÇAMENTO/ }));
    await waitFor(() => expect(assign).toHaveBeenCalled());
  } finally {
    Object.defineProperty(window, "location", { configurable: true, value: original });
  }
  expect(insert).toHaveBeenCalledWith(expect.objectContaining({ quantity: 2, total_value: 240 }));
  expect(rpc).toHaveBeenCalledWith("create_public_order", { payload: expect.objectContaining({
    items: [{ product_id: "p20", quantity: 2 }],
    customer: expect.objectContaining({ notes: expect.stringContaining("Tamanho: 20 cm") }),
  }) });
});
