import { useState, useEffect } from "react";
import { readConsent, writeConsent } from "@/lib/metaPixel";

export const useCookieConsent = () => {
  const [consent, setConsent] = useState<boolean | null>(null);

  useEffect(() => {
    const sync = () => setConsent(readConsent());
    sync();
    window.addEventListener("cookie-consent-change", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("cookie-consent-change", sync); window.removeEventListener("storage", sync); };
  }, []);

  const accept = () => {
    writeConsent(true);
    setConsent(true);
  };

  const decline = () => {
    writeConsent(false);
    setConsent(false);
  };

  return { consent, accept, decline };
};
