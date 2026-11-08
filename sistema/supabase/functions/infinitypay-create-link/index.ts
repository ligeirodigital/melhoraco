import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import {
  corsHeaders,
  jsonResponse,
  generateOrderNsu,
  logPaymentEvent,
} from "../_shared/infinitypay.ts";

interface CreateLinkBody {
  quoteId: string;
  handle?: string;
  redirectUrl?: string;
  sandbox?: boolean;
}


// Endereço base do sistema (ex.: https://melhoraco.vercel.app/sistema).
// Usa o redirectUrl enviado pelo site, cortando o trecho /pedido/... se houver.
function appBase(redirectUrl?: string): string {
  const fallback = (Deno.env.get("MELHORACO_SITE_URL") ?? "https://melhoraco.vercel.app/sistema").replace(/\/+$/, "");
  if (!redirectUrl) return fallback;
  try {
    const u = new URL(redirectUrl);
    const path = u.pathname.replace(/\/pedido\/.*$/, "").replace(/\/+$/, "");
    return `${u.origin}${path}`;
  } catch {
    return fallback;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceKey, { db: { schema: "melhoraco" } });

  try {
    const body = (await req.json()) as CreateLinkBody;
    const { quoteId, handle, redirectUrl, sandbox } = body;

    if (!quoteId) {
      return jsonResponse({ error: "quoteId é obrigatório" }, 400);
    }

    // 1) Buscar orçamento + cliente + itens (fonte da verdade no banco)
    const { data: quote, error: qErr } = await supabase
      .from("quotes")
      .select(
        `id, user_id, client_id, delivery_fee, installation_fee, discount_amount,
         delivery_value, installation_value, order_nsu,
         clients:client_id ( name, phone, cnpj_cpf, address, address_number,
           address_complement, cep ),
         quote_items ( unit_price, quantity, product_id, products:product_id (name) )`,
      )
      .eq("id", quoteId)
      .maybeSingle();

    if (qErr || !quote) {
      return jsonResponse({ error: "Orçamento não encontrado", details: qErr?.message }, 404);
    }

    // 1.1) Buscar configurações de InfinityPay do dono do orçamento
    const { data: bs } = await supabase
      .from("business_settings")
      .select("infinitypay_handle, infinitypay_sandbox")
      .eq("user_id", quote.user_id)
      .maybeSingle();

    const effectiveHandle = (handle && String(handle).trim()) || (bs?.infinitypay_handle || null);
    const effectiveSandbox = sandbox ?? Boolean(bs?.infinitypay_sandbox);

    // 2) Calcular total
    const itemsTotal = (quote.quote_items || []).reduce(
      (sum: number, it: any) => sum + Number(it.unit_price || 0) * Number(it.quantity || 0),
      0,
    );
    const extras =
      Number(quote.delivery_fee || quote.delivery_value || 0) +
      Number(quote.installation_fee || quote.installation_value || 0);
    const discount = Number(quote.discount_amount || 0);
    const amount = Math.max(0, itemsTotal + extras - discount);

    if (amount <= 0) return jsonResponse({ error: "Valor total inválido" }, 400);

    // 3) Garantir order_nsu persistido
    let orderNsu = quote.order_nsu as string | null;
    if (!orderNsu) {
      orderNsu = generateOrderNsu(quote.id);
      await supabase.from("quotes").update({ order_nsu: orderNsu }).eq("id", quote.id);
    }

    const client = (quote as any).clients || {};
    const clientName = client.name || "Cliente";
    const description = (
      quote.quote_items?.[0]?.products?.name
        ? `${quote.quote_items[0].products.name}${(quote.quote_items?.length || 0) > 1 ? " e outros" : ""}`
        : `Orçamento ${orderNsu}`
    ).substring(0, 100);

    // ============ SANDBOX MODE ============
    if (effectiveSandbox) {
      const sandboxUrl = `${appBase(redirectUrl)}/sandbox/pay/${quoteId}?amount=${amount}`;

      await supabase.from("payment_transactions").insert({
        user_id: quote.user_id,
        quote_id: quoteId,
        provider: "infinitypay",
        external_id: `sandbox_${quoteId}`,
        order_nsu: orderNsu,
        amount,
        status: "pending",
        payment_link: sandboxUrl,
        checkout_url: sandboxUrl,
        metadata: { sandbox: true, handle: handle || "sandbox" },
      });
      await supabase
        .from("quotes")
        .update({ payment_status: "pending", payment_method: "infinitypay" } as any)
        .eq("id", quoteId);

      await logPaymentEvent(supabase, quoteId, "checkout_created", "sandbox", {
        amount,
        orderNsu,
      });

      return jsonResponse({
        url: sandboxUrl,
        checkout_url: sandboxUrl,
        order_nsu: orderNsu,
        sandbox: true,
      });
    }

    // ============ MODO REAL ============
    if (!effectiveHandle) {
      return jsonResponse(
        { error: "handle da InfinityPay não configurado. Configure em Configurações." },
        400,
      );
    }

    const webhookToken = Deno.env.get("MELHORACO_INFINITYPAY_WEBHOOK_TOKEN") ?? "";
    const webhookUrl =
      `${supabaseUrl}/functions/v1/melhoraco-infinitypay-webhook` +
      (webhookToken ? `?token=${encodeURIComponent(webhookToken)}` : "");
    const priceInCents = Math.round(amount * 100);
    const cleanHandle = String(effectiveHandle).trim().replace(/^[@$]+/, "");

    const successUrl = `${appBase(redirectUrl)}/pedido/${quoteId}/sucesso`;

    // ============ API oficial: POST /links ============
    // https://api.checkout.infinitepay.io/links
    const payload: Record<string, unknown> = {
      handle: cleanHandle,
      order_nsu: orderNsu,
      redirect_url: successUrl,
      webhook_url: webhookUrl,
      items: [{ quantity: 1, price: priceInCents, description: description }],
    };
    if (clientName || client.phone) {
      payload.customer = {
        name: clientName,
        phone_number: client.phone
          ? String(client.phone).replace(/\D/g, "")
          : undefined,
      };
    }

    const apiRes = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const apiBody = await apiRes.json().catch(() => ({}));
    if (!apiRes.ok) {
      console.error("infinitypay /links error:", apiRes.status, apiBody);
      return jsonResponse(
        { error: "Falha ao gerar link InfinityPay", status: apiRes.status, details: apiBody },
        502,
      );
    }

    // Resposta pode vir como { url, slug } ou aninhada; tentamos ambos.
    const checkoutUrl: string =
      apiBody?.url ||
      apiBody?.checkout_url ||
      apiBody?.data?.url ||
      (apiBody?.slug ? `https://checkout.infinitepay.io/${cleanHandle}/${apiBody.slug}` : "");
    const invoiceSlug: string | null =
      apiBody?.slug || apiBody?.invoice_slug || apiBody?.data?.slug || null;

    if (!checkoutUrl) {
      return jsonResponse(
        { error: "Resposta InfinityPay sem URL", details: apiBody },
        502,
      );
    }

    await supabase.from("payment_transactions").insert({
      user_id: quote.user_id,
      quote_id: quoteId,
      provider: "infinitypay",
      external_id: orderNsu,
      order_nsu: orderNsu,
      invoice_slug: invoiceSlug,
      amount,
      status: "pending",
      payment_link: checkoutUrl,
      checkout_url: checkoutUrl,
      metadata: { handle: cleanHandle, mode: "api_links", response: apiBody },
    });

    await supabase
      .from("quotes")
      .update({
        payment_status: "pending",
        payment_method: "infinitypay",
        payment_invoice_slug: invoiceSlug,
        payment_amount: amount,
      } as any)
      .eq("id", quoteId);

    await logPaymentEvent(supabase, quoteId, "checkout_created", "create_link", {
      amount,
      orderNsu,
      invoiceSlug,
      url: checkoutUrl,
    });

    return jsonResponse({
      url: checkoutUrl,
      checkout_url: checkoutUrl,
      order_nsu: orderNsu,
      invoice_slug: invoiceSlug,
    });

  } catch (e) {
    const msg = (e as Error).message;
    console.error("create-link error:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
