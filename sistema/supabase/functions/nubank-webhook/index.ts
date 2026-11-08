import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { db: { schema: "melhoraco" } },
    );

    const payload = await req.json();
    
    // Log do webhook recebido
    await supabaseClient.from("webhook_logs").insert({
      provider: "nubank",
      payload: payload,
      status: "received"
    });

    // Lógica específica para Nubank (NuPay for Business)
    // Geralmente o Nubank envia eventos como 'payment.succeeded' ou status no corpo
    const { status, external_id, event_type } = payload;

    // Se o status for pago (ajustar conforme a doc real do NuPay)
    if (status === "PAID" || event_type === "payment.succeeded") {
      const quoteId = external_id || payload.id; // Supondo que external_id seja o ID do orçamento

      if (quoteId) {
        // 1. Atualizar Status de Pagamento
        const { error: updateError } = await supabaseClient
          .from("quotes")
          .update({ 
            payment_status: "paid",
            payment_date: new Date().toISOString(),
            status: "aprovado" // Aprova automaticamente se pago
          } as any)
          .eq("id", quoteId);

        if (updateError) throw updateError;

        // 2. Atualizar Etapa de Produção (se houver coluna stage ou pipeline)
        await supabaseClient
          .from("quotes")
          .update({ stage: "producao" } as any)
          .eq("id", quoteId);
          
        console.log(`Orcamento ${quoteId} atualizado com sucesso via Webhook Nubank.`);
      }
    }

    return new Response(JSON.stringify({ message: "Webhook processed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Erro no webhook:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
