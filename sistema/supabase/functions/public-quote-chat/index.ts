// Chat IA no portal público do cliente.
// Recebe {quote_id, token, messages} e responde streaming via Lovable AI Gateway.
// verify_jwt = false (portal público), mas valida client_view_token contra o banco.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("MELHORACO_AI_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Assistente indisponível no momento. Fale com a gente pelo WhatsApp." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const quote_id: string | undefined = body?.quote_id;
    const token: string | undefined = body?.token;
    const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];

    if (!quote_id || !token || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize + limit
    const clean = messages
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-16)
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));

    if (clean.length === 0) {
      return new Response(JSON.stringify({ error: "Mensagens inválidas" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Valida token + carrega orçamento
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey, { db: { schema: "melhoraco" } });

    const { data: quote, error: qErr } = await supabase
      .from("quotes")
      .select(
        `id, client_view_token, status, total_amount, delivery_fee, installation_fee,
         discount_amount, discount_type, delivery_deadline, warranty_months, notes,
         clients:client_id (name, phone, address),
         quote_items (quantity, unit_price, products:product_id (name, description))`,
      )
      .eq("id", quote_id)
      .maybeSingle();

    if (qErr || !quote || quote.client_view_token !== token) {
      return new Response(JSON.stringify({ error: "Orçamento inválido" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await supabase
      .from("business_settings")
      .select("*")
      .maybeSingle();

    // Monta system prompt
    const itens = (quote.quote_items || [])
      .map((i: any) => `- ${i.quantity}x ${i.products?.name ?? "item"} @ R$ ${Number(i.unit_price).toFixed(2)}`)
      .join("\n");

    const systemPrompt = `Você é a assistente virtual da Melhoraço, ajudando o cliente ${(quote as any).clients?.name ?? ""} a tirar dúvidas sobre o orçamento dele.

Dados do orçamento:
- Status: ${quote.status}
- Total: R$ ${Number(quote.total_amount ?? 0).toFixed(2)}
- Frete: R$ ${Number(quote.delivery_fee ?? 0).toFixed(2)}
- Instalação: R$ ${Number(quote.installation_fee ?? 0).toFixed(2)}
- Prazo de entrega: ${quote.delivery_deadline ?? "a combinar"}
- Garantia: ${quote.warranty_months ?? 12} meses
- Observações: ${quote.notes ?? "nenhuma"}
Itens:
${itens || "(sem itens listados)"}

Contato da empresa:
- PIX (Nubank): ${settings?.nubank_pix_key ?? "sob consulta"}
- Formas de pagamento: PIX, cartão via InfinityPay (parcelamento disponível).

Regras:
- Seja breve, cordial e responda em português brasileiro.
- Só fale sobre este orçamento, produtos da Melhoraço, pagamento, prazo, garantia e instalação.
- Se o cliente pedir desconto ou alteração de itens, oriente-o a falar diretamente pelo WhatsApp — você não pode alterar o orçamento.
- Nunca invente valores; se não souber, diga que vai verificar.`;

    const upstream = await fetch(`${(Deno.env.get("MELHORACO_AI_BASE_URL") ?? "https://api.openai.com/v1").replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: Deno.env.get("MELHORACO_AI_MODEL") ?? "gpt-5-mini",
        stream: true,
        messages: [{ role: "system", content: systemPrompt }, ...clean],
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      const status = upstream.status === 429 || upstream.status === 402 ? upstream.status : 500;
      return new Response(
        JSON.stringify({
          error:
            upstream.status === 429
              ? "Muitas mensagens. Aguarde alguns segundos."
              : upstream.status === 402
                ? "Créditos de IA esgotados. Fale com a empresa."
                : `Erro na IA: ${errText.slice(0, 200)}`,
        }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(upstream.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("[public-quote-chat]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
