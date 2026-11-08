// Envia notificações no celular (Web Push) da Melhoraço.
// Chamada só pelo banco (função melhoraco.notify_push), autenticada pelo header x-push-secret.
// Tipos: sale (venda paga -> investidores), withdrawal_request (pedido de saque -> administradores),
// withdrawal_decided (pedido pago/recusado -> investidor que pediu).
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { db: { schema: "melhoraco" } });

  const { data: secrets } = await db.from("app_secrets").select("key, value").in("key", ["push_secret", "vapid_public", "vapid_private"]);
  const s = Object.fromEntries((secrets ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  if (!s.push_secret || req.headers.get("x-push-secret") !== s.push_secret) return json({ error: "unauthorized" }, 401);
  webpush.setVapidDetails("mailto:melhoracooficial@gmail.com", s.vapid_public, s.vapid_private);

  const body = await req.json().catch(() => ({}));
  const kind = String(body.kind ?? "");
  let userIds: string[] = [];
  let message: { title: string; body: string; url: string; tag: string } | null = null;

  if (kind === "sale" && body.quote_id) {
    const { data: q } = await db
      .from("quotes")
      .select("id, payment_amount, delivery_fee, installation_fee, discount_amount, quote_items(quantity, unit_price, product_name, products:product_id(name))")
      .eq("id", body.quote_id)
      .maybeSingle();
    if (!q) return json({ ok: false, reason: "quote_not_found" });
    const items = (q.quote_items ?? []) as Array<{ quantity: number; unit_price: number; product_name?: string; products?: { name?: string } }>;
    const computed = items.reduce((t, i) => t + Number(i.unit_price || 0) * Number(i.quantity || 0), 0)
      + Number(q.delivery_fee || 0) + Number(q.installation_fee || 0) - Number(q.discount_amount || 0);
    const total = Number(q.payment_amount) > 0 ? Number(q.payment_amount) : Math.max(computed, 0);
    const summary = items.slice(0, 2).map((i) => `${i.quantity}× ${i.products?.name ?? i.product_name ?? "item"}`).join(", ");
    const { data: inv } = await db.from("investors").select("user_id").not("user_id", "is", null);
    userIds = (inv ?? []).map((r: { user_id: string }) => r.user_id);
    message = {
      title: `Venda finalizada: ${brl(total)}`,
      body: summary ? `${summary}${items.length > 2 ? " e mais" : ""}. Entra no lucro do mês.` : "Entra no lucro do mês.",
      url: "/sistema/investidor",
      tag: `sale-${q.id}`,
    };
  } else if ((kind === "withdrawal_request" || kind === "withdrawal_decided") && body.request_id) {
    const { data: r } = await db
      .from("withdrawal_requests")
      .select("id, amount, status, requested_by, investors:investor_id(name)")
      .eq("id", body.request_id)
      .maybeSingle();
    if (!r) return json({ ok: false, reason: "request_not_found" });
    const name = (r as { investors?: { name?: string } }).investors?.name ?? "Investidor";
    if (kind === "withdrawal_request") {
      const { data: admins } = await db.from("user_roles").select("user_id").eq("role", "admin");
      userIds = (admins ?? []).map((a: { user_id: string }) => a.user_id);
      message = { title: `Pedido de saque: ${brl(Number(r.amount))}`, body: `${name} pediu um saque. Toque para ver e confirmar o Pix.`, url: "/sistema/dre", tag: `wd-${r.id}` };
    } else {
      userIds = [r.requested_by];
      const paid = r.status === "pago";
      message = {
        title: paid ? `Saque pago: ${brl(Number(r.amount))}` : "Pedido de saque recusado",
        body: paid ? "O valor já saiu do seu saldo. Confira o Pix." : "Abra o painel para ver o motivo.",
        url: "/sistema/investidor",
        tag: `wd-${r.id}`,
      };
    }
  } else {
    return json({ ok: false, reason: "invalid_kind" }, 400);
  }

  if (!message || userIds.length === 0) return json({ ok: true, sent: 0 });
  const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").in("user_id", userIds);
  let sent = 0;
  const expired: string[] = [];
  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(message),
        { TTL: 60 * 60 * 24 },
      );
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) expired.push(sub.id);
      else console.error("[push] falha ao enviar:", code, (e as Error).message);
    }
  }
  if (expired.length) await db.from("push_subscriptions").delete().in("id", expired);
  return json({ ok: true, sent, removed: expired.length });
});
