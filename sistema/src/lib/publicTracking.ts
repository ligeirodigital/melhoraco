import { supabase } from "@/integrations/supabase/client";
import { getAttribution } from "./attribution";
import { newEventId, trackMetaEvent, isPublicTrackingRoute } from "./metaPixel";
import { reportError } from "./reportError";

export type PageTrackingContext = { landing_page_id?: string | null; product_landing_page_id?: string | null };
let pageContext: PageTrackingContext = {};
export function setTrackingPageContext(context: PageTrackingContext) { pageContext = context; }
export function trackWhatsAppClick(url: string, context: PageTrackingContext = pageContext) {
  if (!isPublicTrackingRoute(window.location.pathname)) return;
  const eventId = newEventId();
  const phone = new URL(url).pathname.replace(/\D/g, "");
  const payload = { ...getAttribution(), ...context, whatsapp_number: phone || null, page_path: window.location.pathname, event_id: eventId };
  // keepalive queues the request before opening WhatsApp, without losing the user gesture.
  const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/whatsapp_clicks`;
  void fetch(endpoint, {
    method: "POST", keepalive: true,
    headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`, Prefer: "return=minimal" },
    body: JSON.stringify(payload),
  }).then(async response => {
    if (!response.ok) reportError(new Error(`Registro de contato recusado (${response.status})`), { scope: "whatsapp-tracking", silent: true, extra: { eventId } });
  }).catch(async () => {
    // Only retry transport failures; the same event ID is unique server-side.
    try { const { error } = await supabase.from("whatsapp_clicks").insert(payload); if (error?.code !== "23505" && error) throw error; }
    catch (error) { reportError(error, { scope: "whatsapp-tracking", silent: true, extra: { eventId } }); }
  });
  trackMetaEvent("Contact", {}, eventId);
}
export function openTrackedWhatsApp(url: string, context?: PageTrackingContext) {
  trackWhatsAppClick(url, context);
  window.open(url, "_blank", "noopener,noreferrer");
}
