import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { captureAttribution } from "@/lib/attribution";
import { isPublicTrackingRoute, newEventId, trackMetaEvent, pauseMetaPixel } from "@/lib/metaPixel";
import { setTrackingPageContext, trackWhatsAppClick } from "@/lib/publicTracking";
import { CookieConsent } from "./CookieConsent";

export function PublicTracking() {
  const { pathname, search, key } = useLocation();
  const publicRoute = isPublicTrackingRoute(pathname);
  useEffect(() => {
    setTrackingPageContext({});
    if (!publicRoute) { pauseMetaPixel(); return; }
    captureAttribution();
    const eventId = newEventId();
    const pageView = () => trackMetaEvent("PageView", {}, eventId);
    pageView();
    window.addEventListener("cookie-consent-change", pageView);
    window.addEventListener("storage", pageView);
    const click = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      try { const url = new URL(anchor.href); if (["wa.me", "api.whatsapp.com", "web.whatsapp.com"].includes(url.hostname)) trackWhatsAppClick(url.href); } catch { /* Not an external URL. */ }
    };
    document.addEventListener("click", click, true);
    return () => { document.removeEventListener("click", click, true); window.removeEventListener("cookie-consent-change", pageView); window.removeEventListener("storage", pageView); };
  }, [pathname, search, key, publicRoute]);
  return publicRoute ? <CookieConsent /> : null;
}
