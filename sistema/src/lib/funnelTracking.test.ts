import { beforeEach, describe, expect, it, vi } from "vitest";
import { ATTRIBUTION_KEY, ATTRIBUTION_TTL, captureAttribution, getAttribution, resetAttributionMemory, leadOriginLabel, LEAD_ORIGINS } from "./attribution";
import { META_PIXEL_ID, isPublicTrackingRoute, trackMetaEvent, trackPurchase, writeConsent } from "./metaPixel";

beforeEach(() => {
  localStorage.clear(); resetAttributionMemory(); vi.restoreAllMocks();
  window.history.replaceState({}, "", "/loja");
  Object.defineProperty(document, "referrer", { configurable: true, value: "" });
  window.fbq = vi.fn();
});
describe("Atribuição de primeiro e último toque", () => {
  it("preserva campanha inicial por 30 dias e atualiza último toque", () => {
    window.history.replaceState({}, "", "/p/quiz?utm_source=instagram&utm_medium=paid&utm_campaign=outubro&utm_content=video&utm_term=inox&fbclid=fb123&gclid=g123");
    const first = captureAttribution(1000);
    expect(first.first.data).toMatchObject({ utm_source: "instagram", utm_medium: "paid", utm_campaign: "outubro", utm_content: "video", utm_term: "inox", fbclid: "fb123", gclid: "g123" });
    window.history.replaceState({}, "", "/loja?utm_source=google");
    const later = captureAttribution(2000);
    expect(later.first.data.utm_source).toBe("instagram"); expect(later.last.data.utm_source).toBe("google");
    window.history.replaceState({}, "", "/loja/produto/123");
    expect(captureAttribution(3000).last.data.utm_source).toBe("google");
    expect(captureAttribution(1000 + ATTRIBUTION_TTL).first.data.utm_source).toBeNull();
    expect(ATTRIBUTION_TTL).toBe(2592000000);
  });
  it("mantém referrer externo e ignora navegação interna", () => {
    Object.defineProperty(document, "referrer", { configurable: true, value: "https://instagram.com/" });
    expect(getAttribution().referrer).toBe("https://instagram.com/");
    Object.defineProperty(document, "referrer", { configurable: true, value: `${location.origin}/loja` });
    expect(getAttribution().referrer).toBe("https://instagram.com/");
  });
  it("não quebra com armazenamento indisponível ou corrompido", () => {
    localStorage.setItem(ATTRIBUTION_KEY, "invalid");
    expect(() => getAttribution()).not.toThrow();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("disabled"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("disabled"); });
    expect(() => getAttribution()).not.toThrow();
  });
  it("separa origem comercial do canal manual/loja", () => {
    expect(LEAD_ORIGINS).toEqual(["Instagram", "Meta Ads", "Google Ads", "Indicação", "WhatsApp direto", "Outro"]);
    expect(leadOriginLabel({ source: "manual", lead_origin: "Instagram" })).toBe("Instagram");
    expect(leadOriginLabel({ source: "manual" })).toBe("Manual");
    expect(leadOriginLabel({ source: "store", gclid: "g123" })).toBe("Google Ads");
  });
});
describe("Pixel apenas público e com consentimento", () => {
  it("inclui somente as rotas públicas solicitadas", () => {
    for (const path of ["/p/quiz", "/projetos", "/loja", "/loja/produto/123", "/revendedores", "/pedido/123/sucesso"]) expect(isPublicTrackingRoute(path)).toBe(true);
    for (const path of ["/", "/dashboard", "/quotes/123", "/settings", "/admin/loja", "/dre", "/lojax"]) expect(isPublicTrackingRoute(path)).toBe(false);
  });
  it("não emite antes do consentimento ou após recusa", () => {
    writeConsent(false);
    expect(trackMetaEvent("Lead", {}, "no-consent")).toBe(false);
    expect(window.fbq).not.toHaveBeenCalledWith("trackSingle", expect.anything(), expect.anything(), expect.anything(), expect.anything());
  });
  it("envia o ID exato e deduplica cada evento", () => {
    writeConsent(true);
    expect(trackMetaEvent("Contact", {}, "contact-unique")).toBe(true);
    expect(trackMetaEvent("Contact", {}, "contact-unique")).toBe(false);
    expect(window.fbq).toHaveBeenCalledWith("trackSingle", "1286022477066942", "Contact", {}, { eventID: "contact-unique" });
    expect(META_PIXEL_ID).toBe("1286022477066942");
  });
  it("não dispara no painel mesmo com consentimento", () => {
    writeConsent(true); window.history.replaceState({}, "", "/dashboard");
    expect(trackMetaEvent("PageView", {}, "admin-page")).toBe(false);
  });
  it("Purchase exige pagamento confirmado, BRL e valor real; não repete na recarga", () => {
    writeConsent(true);
    expect(trackPurchase({ id: "sale-test", payment_status: "pending", payment_amount: 1000 })).toBe(false);
    expect(trackPurchase({ id: "sale-test", payment_status: "paid", payment_amount: null })).toBe(false);
    expect(trackPurchase({ id: "sale-test", payment_status: "paid", payment_amount: 1000 })).toBe(true);
    expect(window.fbq).toHaveBeenCalledWith("trackSingle", META_PIXEL_ID, "Purchase", { value: 1000, currency: "BRL" }, { eventID: "purchase-sale-test" });
    expect(trackPurchase({ id: "sale-test", payment_status: "paid", payment_amount: 1000 })).toBe(false);
  });
});
