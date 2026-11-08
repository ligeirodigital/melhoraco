export const ATTRIBUTION_TTL = 30 * 24 * 60 * 60 * 1000;
export const ATTRIBUTION_KEY = "melhoraco_attribution_v1";
export const attributionFields = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid", "referrer"] as const;
export type Attribution = Record<typeof attributionFields[number], string | null>;
type Touch = { data: Attribution; at: number };
export type AttributionHistory = { first: Touch; last: Touch };
let memory: AttributionHistory | null = null;
const empty = (): Attribution => Object.fromEntries(attributionFields.map(key => [key, null])) as Attribution;

export function captureAttribution(now = Date.now()): AttributionHistory {
  const params = new URLSearchParams(window.location.search);
  const data = empty();
  for (const key of attributionFields) data[key] = (params.get(key) || null)?.slice(0, 1000) ?? null;
  let externalReferrer: string | null = null;
  try {
    if (document.referrer && new URL(document.referrer).origin !== window.location.origin) externalReferrer = document.referrer.slice(0, 1000);
  } catch { /* Invalid referrers are not attribution. */ }
  data.referrer = externalReferrer;
  let stored = memory;
  try { stored = JSON.parse(localStorage.getItem(ATTRIBUTION_KEY) || "null"); } catch { /* Storage may be disabled. */ }
  if (!stored?.first?.at || now - stored.first.at >= ATTRIBUTION_TTL || !stored.last?.data) stored = null;
  const touch = { data, at: now };
  const hasCampaign = attributionFields.some(key => key !== "referrer" && data[key]);
  // Returning via internal links must not erase a paid/social campaign.
  const changed = stored && JSON.stringify(stored.last.data) !== JSON.stringify(data);
  memory = stored ? { first: stored.first, last: (hasCampaign || externalReferrer) && changed ? touch : stored.last } : { first: touch, last: touch };
  try { localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(memory)); } catch { /* In-memory fallback. */ }
  return memory;
}
export function getAttribution(): Attribution { return captureAttribution().first.data; }
export function resetAttributionMemory() { memory = null; }
export const LEAD_ORIGINS = ["Instagram", "Meta Ads", "Google Ads", "Indicação", "WhatsApp direto", "Outro"] as const;
export function leadOriginLabel(quote: { lead_origin?: string | null; utm_source?: string | null; utm_medium?: string | null; gclid?: string | null; fbclid?: string | null; source?: string | null }) {
  if (quote.lead_origin) return quote.lead_origin;
  if (quote.gclid) return "Google Ads";
  if (/paid|cpc|ads/i.test(quote.utm_medium || "") && /meta|facebook|instagram|fb|ig/i.test(quote.utm_source || "")) return "Meta Ads";
  return quote.utm_source || (quote.fbclid ? "Meta" : quote.source === "store" ? "Loja" : "Manual");
}
