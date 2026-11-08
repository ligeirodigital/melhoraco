export const META_PIXEL_ID = "1286022477066942";
export function isPublicTrackingRoute(path: string) {
  return /^\/p\/[^/]+\/?$/.test(path) || path === "/projetos" || /^\/loja(?:\/|$)/.test(path) || path === "/revendedores" || /^\/pedido\/[^/]+\/sucesso\/?$/.test(path);
}
type Fbq = ((...args: unknown[]) => void) & { queue?: unknown[][]; callMethod?: (...args: unknown[]) => void; loaded?: boolean; version?: string; push?: Fbq };
declare global { interface Window { fbq?: Fbq; _fbq?: Fbq } }
let initialized = false;
let volatileConsent: boolean | null = null;
const sent = new Set<string>();
export function readConsent(): boolean | null {
  try { const value = localStorage.getItem("cookie-consent"); return value === "true" ? true : value === "false" ? false : volatileConsent; } catch { return volatileConsent; }
}
export function writeConsent(value: boolean) {
  volatileConsent = value;
  if (!value) window.fbq?.("consent", "revoke");
  try { localStorage.setItem("cookie-consent", String(value)); } catch { /* Private browsing. */ }
  window.dispatchEvent(new Event("cookie-consent-change"));
}
export function ensureMetaPixel() {
  if (readConsent() !== true || !isPublicTrackingRoute(window.location.pathname)) return false;
  if (!window.fbq) {
    const fbq: Fbq = (...args) => { if (fbq.callMethod) fbq.callMethod(...args); else fbq.queue?.push(args); };
    fbq.queue = []; fbq.push = fbq; fbq.loaded = true; fbq.version = "2.0";
    window.fbq = fbq; window._fbq = fbq;
  }
  if (!initialized) {
    window.fbq("set", "autoConfig", false, META_PIXEL_ID);
    window.fbq("init", META_PIXEL_ID); initialized = true;
    const script = document.createElement("script"); script.id = "melhoraco-meta-pixel"; script.async = true; script.src = "https://connect.facebook.net/en_US/fbevents.js"; document.head.appendChild(script);
  }
  window.fbq("consent", "grant");
  return true;
}
export function pauseMetaPixel() { window.fbq?.("consent", "revoke"); }
export function newEventId(): string { return crypto.randomUUID(); }
export function trackMetaEvent(name: "PageView" | "Lead" | "Contact" | "InitiateCheckout" | "Purchase", data: Record<string, unknown> = {}, eventId: string = newEventId()) {
  if (!ensureMetaPixel() || sent.has(eventId)) return false;
  window.fbq?.("trackSingle", META_PIXEL_ID, name, data, { eventID: eventId });
  sent.add(eventId);
  return true;
}
export function trackPurchase(quote: { id: string; payment_status: string | null; payment_amount: number | null }) {
  if (quote.payment_status !== "paid" || quote.payment_amount == null || !Number.isFinite(Number(quote.payment_amount))) return false;
  const eventId = `purchase-${quote.id}`;
  try { if (localStorage.getItem(eventId) === "sent") return false; } catch { /* In-memory dedupe remains. */ }
  const fired = trackMetaEvent("Purchase", { value: Number(quote.payment_amount), currency: "BRL" }, eventId);
  if (fired) try { localStorage.setItem(eventId, "sent"); } catch { /* Storage optional. */ }
  return fired;
}
