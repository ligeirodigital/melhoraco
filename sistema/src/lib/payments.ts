import { supabase, FN_PREFIX } from "@/integrations/supabase/client";
import { appUrl } from "@/lib/appUrl";

export type PaymentProvider = "mercadopago" | "nubank" | "infinitypay";
export type PaymentStatus = "pending" | "paid" | "expired" | "refunded";

export interface CreatePaymentParams {
  quoteId: string;
  userId: string;
  amount: number;
  provider: PaymentProvider;
  clientName: string;
}

export async function createPaymentLink(params: CreatePaymentParams) {
  const { quoteId, userId, amount, provider, clientName } = params;

  // ============ INFINITYPAY (API oficial - link de checkout) ============
  if (provider === "infinitypay") {
    const handle = localStorage.getItem(`infinitypay_handle_${userId}`);
    const sandbox = localStorage.getItem(`infinitypay_sandbox_${userId}`) === "1";
    if (!handle && !sandbox) {
      throw new Error("Configure seu handle da InfinityPay em Configurações antes de gerar o link.");
    }

    const { data, error } = await supabase.functions.invoke(`${FN_PREFIX}infinitypay-create-link`, {
      body: {
        handle: handle || undefined,
        quoteId,
        redirectUrl: `${appUrl()}/pedido/${quoteId}/sucesso`,
        sandbox,
      },
    });

    if (error) throw error;
    if (!data?.url) throw new Error("Link não retornado pela InfinityPay");

    return {
      provider: "infinitypay",
      quote_id: quoteId,
      amount,
      status: "pending",
      payment_link: data.url,
      checkout_url: data.checkout_url,
      order_nsu: data.order_nsu,
      invoice_slug: data.invoice_slug,
      qr_code: data.qr_code,
      qr_code_base64: data.qr_code_base64,
      external_id: data.order_nsu || quoteId,
      sandbox,
    };
  }

  // ============ Outros provedores (Nubank/Mercado Pago - PIX estático) ============
  const { data: settings } = await supabase
    .from("business_settings")
    .select("nubank_pix_key, nubank_pix_name")
    .eq("user_id", userId)
    .single();

  const pixKey = settings?.nubank_pix_key || "thiago@melhoraco.com.br";
  const receiverName = settings?.nubank_pix_name || "JOSE THIAGO OLIVEIRA";

  console.log(`Gerando link de pagamento ${provider} para ${clientName}: R$ ${amount}`);

  const externalId = `ext_${Math.random().toString(36).substr(2, 9)}`;
  const paymentLink = `https://checkout.${provider}.com.br/pay/${externalId}`;
  const qrCode = `00020101021226850014br.gov.bcb.pix01${pixKey.length.toString().padStart(2, '0')}${pixKey}520400005303986540${amount.toFixed(2)}5802BR59${receiverName.length.toString().padStart(2, '0')}${receiverName.substr(0, 25)}6009SAO PAULO62070503***6304${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;

  const { data, error } = await supabase
    .from("payment_transactions")
    .insert({
      user_id: userId,
      quote_id: quoteId,
      provider,
      external_id: externalId,
      amount,
      status: "pending",
      payment_link: paymentLink,
      qr_code: qrCode,
      metadata: { client_name: clientName },
    })
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from("quotes")
    .update({ payment_status: "pending", payment_method: provider } as any)
    .eq("id", quoteId);

  return data;
}

export async function checkPaymentStatus(transactionId: string) {
  // Em uma integração real, isso consultaria a API do provedor ou esperaria o Webhook.
  // Aqui vamos apenas simular uma verificação.
  
  const { data: tx, error } = await supabase
    .from("payment_transactions")
    .select("*, quotes(id)")
    .eq("id", transactionId)
    .single();

  if (error) throw error;
  
  return tx;
}

export async function simulatePaymentSuccess(transactionId: string) {
  const { data: tx, error } = await supabase
    .from("payment_transactions")
    .update({ status: "paid" })
    .eq("id", transactionId)
    .select()
    .single();

  if (error) throw error;

  // Se pago, atualizar orçamento e disparar automações (como baixa de estoque se não foi feita)
  await supabase
    .from("quotes")
    .update({ payment_status: "paid" } as any)
    .eq("id", tx.quote_id);

  return tx;
}
