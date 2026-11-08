import { beforeEach, expect, it, vi } from "vitest";
import { openTrackedWhatsApp } from "./publicTracking";
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: vi.fn() } }));
vi.mock("./metaPixel", () => ({ newEventId: () => "click-123", trackMetaEvent: vi.fn(), isPublicTrackingRoute: () => true }));
import { trackMetaEvent } from "./metaPixel";
beforeEach(() => { localStorage.clear(); window.history.replaceState({}, "", "/loja?utm_source=instagram"); });
it("inicia gravação keepalive antes de abrir WhatsApp e usa o mesmo eventID", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
  vi.stubGlobal("fetch", fetcher);
  const opener = vi.spyOn(window, "open").mockImplementation(() => null);
  openTrackedWhatsApp("https://wa.me/5585999999999?text=hello");
  expect(fetcher.mock.invocationCallOrder[0]).toBeLessThan(opener.mock.invocationCallOrder[0]);
  const options = fetcher.mock.calls[0]?.[1];
  expect(options.keepalive).toBe(true);
  expect(JSON.parse(options.body)).toMatchObject({ event_id: "click-123", page_path: "/loja", utm_source: "instagram", whatsapp_number: "5585999999999" });
  expect(trackMetaEvent).toHaveBeenCalledWith("Contact", {}, "click-123");
  vi.unstubAllGlobals(); vi.restoreAllMocks();
});
it("falha do registro não impede abertura do WhatsApp", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 403 })));
  const opener = vi.spyOn(window, "open").mockImplementation(() => null);
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  openTrackedWhatsApp("https://wa.me/5585999999999");
  expect(opener).toHaveBeenCalledTimes(1);
  await vi.waitFor(() => expect(log).toHaveBeenCalled());
  vi.unstubAllGlobals(); vi.restoreAllMocks();
});
