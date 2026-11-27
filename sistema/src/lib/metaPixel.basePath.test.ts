import { beforeEach, expect, it, vi } from "vitest";

// Em produção o sistema roda em melhoraco.vercel.app/sistema, então o navegador
// vê "/sistema/p/quiz" enquanto o roteador vê "/p/quiz".
vi.mock("./appUrl", () => ({ BASE_PATH: "/sistema" }));
import { META_PIXEL_ID, isPublicTrackingRoute, trackMetaEvent, writeConsent } from "./metaPixel";

beforeEach(() => { localStorage.clear(); window.fbq = vi.fn(); });

it("reconhece as rotas públicas com e sem o prefixo /sistema", () => {
  for (const path of ["/p/quiz", "/sistema/p/quiz", "/sistema/loja/produto/123", "/sistema/projetos", "/sistema/pedido/123/sucesso"]) expect(isPublicTrackingRoute(path)).toBe(true);
  for (const path of ["/sistema", "/sistema/", "/sistema/dashboard", "/sistemax/p/quiz", "/sistema/admin/loja"]) expect(isPublicTrackingRoute(path)).toBe(false);
});

it("dispara o Lead do quiz servido em /sistema/p/quiz depois do consentimento", () => {
  writeConsent(true); window.history.replaceState({}, "", "/sistema/p/quiz");
  expect(trackMetaEvent("Lead", {}, "quiz-lead-sistema")).toBe(true);
  expect(window.fbq).toHaveBeenCalledWith("trackSingle", META_PIXEL_ID, "Lead", {}, { eventID: "quiz-lead-sistema" });
});

it("continua sem disparar no painel em /sistema/dashboard", () => {
  writeConsent(true); window.history.replaceState({}, "", "/sistema/dashboard");
  expect(trackMetaEvent("PageView", {}, "painel")).toBe(false);
});
