# Architecture rules

- Keep the orders/finance assistant read-only and authenticated through its Edge Function; aggregate user-scoped records server-side to avoid exposing personal customer data or changing financial records.
- Keep AI Gateway providers, credentials, prompts, run correlation, and persistent access-block state server-side; stream responses through the AI SDK to preserve cancellation and safe upstream errors.
- Load the assistant and its SDK response parser lazily from the financial area to avoid adding AI JavaScript to unrelated screens.
- Use the shared attribution and public tracking modules for funnel events; preserve source as the order creation channel and keep marketing origin separate to avoid breaking store filters.
- Gate Meta initialization and events by consent and public route; persist conversion event IDs and deduplicate confirmed purchases rather than treating a success URL as payment proof.
- Keep sales follow-up ordering and age rules in shared pure helpers; record WhatsApp interactions and contact timestamps atomically with an authenticated SECURITY INVOKER function so existing RLS remains authoritative.
- Reuse pending InfinityPay checkout links for reminders and navigate to existing manual payment controls; capture approval timestamps prospectively without inferring historical approval dates from unrelated updates.
- Centralize catalog promotions, made-to-order availability and size placeholders in shared catalog helpers; keep reference prices informational and use persisted quote item prices/names for historical documents.
- Upload catalog photos to user-scoped paths in the existing business-assets bucket and reuse catalog editing fields across product registrations; do not widen storage policies.
