export { supabase } from "@/integrations/supabase/client";
import { supabase } from "@/integrations/supabase/client";

export interface AllowedEmail {
  email: string;
  created_at: string;
}
import type { Tables } from "@/integrations/supabase/types";
import type { FullQuote, QuoteStatus, Profile as DbProfile } from "@/types/models";

export type { FullQuote, QuoteStatus, DbProfile };
export type DbClient = Tables<"clients"> & { notes?: string | null; cnpj_cpf?: string | null; address?: string | null; address_number?: string | null; address_complement?: string | null; cep?: string | null };
export type DbProduct = Tables<"products"> & { is_digital?: boolean | null; variants?: DbProductVariant[]; hidden?: boolean | null };
export type DbProductVariant = Tables<"product_variants">;
export type DbQuote = Tables<"quotes"> & { last_follow_up?: string | null; pipeline_stage_id?: string | null };
export type DbQuoteItem = Tables<"quote_items"> & { variant?: DbProductVariant };
export type DbBusinessSettings = Tables<"business_settings"> & { logo_url?: string | null; nubank_pix_name?: string | null };
export type DbExpense = Tables<"direct_expenses">;
export type DbProfitWithdrawal = Tables<"profit_withdrawals">;
export type DbInvestor = Tables<"investors">;
export type DbInvestorTransaction = Tables<"investor_transactions">;
export type DbSalesTarget = Tables<"sales_targets">;
export type DbActivityLog = Tables<"activity_logs">;
export type DbPipelineStage = Tables<"pipeline_stages">;
export type DbCashFlow = Tables<"cash_flow_transactions"> & { status?: string; due_date?: string };
export type DbFinancialCategory = Tables<"financial_categories">;
export type DbFeedback = Tables<"client_feedbacks">;

// --- CRM & Interactions ---
export async function fetchInteractions(clientId: string): Promise<Tables<"interactions">[]> {
  try {
    const { data, error } = await supabase
      .from("interactions")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error(`[DataEngine] Error fetching interactions for client ${clientId}:`, error);
      throw error;
    }
    return data ?? [];
  } catch (err) {
    throw err;
  }
}

export async function saveInteraction(interaction: { client_id: string; content: string; type?: string; created_by?: string }) {
  const { error } = await supabase.from("interactions").insert(interaction);
  if (error) throw error;
}

// --- Inventory ---
export async function fetchInventory(): Promise<Tables<"inventory">[]> {
  try {
    const { data, error } = await supabase.from("inventory").select("*").order("name");
    if (error) {
      console.error("[DataEngine] Error fetching inventory:", error);
      throw error;
    }
    return data ?? [];
  } catch (err) {
    throw err;
  }
}

export async function upsertInventory(item: Partial<Tables<"inventory">>) {
  const { error } = await supabase.from("inventory").upsert(item as any);
  if (error) throw error;
}

export async function deleteInventoryItem(id: string) {
  const { error } = await supabase.from("inventory").delete().eq("id", id);
  if (error) throw error;
}


export async function saveInventoryLog(log: { 
  inventory_id?: string; 
  product_id?: string;
  variant_id?: string;
  type: 'in' | 'out'; 
  quantity: number; 
  reason?: string; 
  created_by?: string 
}) {
  console.log("Saving inventory log:", log);
  try {
    if (log.inventory_id) {
      const { data: item, error: fetchError } = await supabase.from("inventory").select("quantity").eq("id", log.inventory_id).single();
      if (fetchError) throw fetchError;
      if (item) {
        const amount = log.type === 'in' ? Number(log.quantity) : -Number(log.quantity);
        const newQty = Number(item.quantity) + amount;
        const { error: updateError } = await supabase.from("inventory").update({ quantity: newQty }).eq("id", log.inventory_id);
        if (updateError) throw updateError;
      }
    } else if (log.variant_id) {
      const amount = log.type === 'in' ? Number(log.quantity) : -Number(log.quantity);
      const { data: variant, error: fetchError } = await supabase.from("product_variants").select("stock_quantity").eq("id", log.variant_id).single();
      if (fetchError) throw fetchError;
      if (variant) {
        const { error: updateError } = await supabase.from("product_variants").update({ stock_quantity: (variant.stock_quantity ?? 0) + amount }).eq("id", log.variant_id);
        if (updateError) throw updateError;
      }
    } else if (log.product_id) {
      const amount = log.type === 'in' ? Number(log.quantity) : -Number(log.quantity);
      const { error: rpcError } = await supabase.rpc("increment_product_stock", { 
        p_product_id: log.product_id, 
        p_amount: amount 
      });
      if (rpcError) throw rpcError;
    }
    
    const { error: insertError } = await supabase.from("inventory_logs").insert(log as any);
    if (insertError) throw insertError;
  } catch (error) {
    console.error("Error in saveInventoryLog:", error);
    throw error;
  }
}

// --- Feedback & Portal Actions ---
// Public flows go through SECURITY DEFINER RPCs that validate the client_view_token,
// so anonymous visitors cannot read or modify quotes that don't belong to them.
export async function saveFeedback(feedback: { quote_id: string, token: string, rating: number, comment?: string, project_photo_url?: string }) {
  const { data, error } = await supabase.rpc("save_public_feedback", {
    p_quote_id: feedback.quote_id,
    p_token: feedback.token,
    p_rating: feedback.rating,
    p_comment: feedback.comment ?? null,
    p_project_photo_url: feedback.project_photo_url ?? null,
  });
  if (error) throw error;
  if (data === false) throw new Error("Token inválido para este orçamento");
}

export async function approveQuoteWithAssets(quoteId: string, payload: {
  token: string;
  customer_signature_url?: string;
  payment_receipt_url?: string;
  status: "aprovado";
}) {
  const { data: ok, error } = await supabase.rpc("approve_public_quote", {
    p_quote_id: quoteId,
    p_token: payload.token,
    p_signature_url: payload.customer_signature_url ?? null,
    p_receipt_url: payload.payment_receipt_url ?? null,
  });
  if (error) throw error;
  if (!ok) throw new Error("Token inválido para este orçamento");

  // Re-fetch the updated quote through the same gated RPC
  const { data: refreshed, error: fetchErr } = await supabase.rpc("get_public_quote", {
    p_slug: `q_${quoteId}_${payload.token}`,
  });
  if (fetchErr) throw fetchErr;
  return refreshed;
}


export async function fetchFeedbacks(): Promise<DbFeedback[]> {
  const { data, error } = await supabase.from("client_feedbacks").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}


// --- Pipeline ---
export async function fetchPipelineStages(): Promise<DbPipelineStage[]> {
  const { data, error } = await supabase
    .from("pipeline_stages")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export async function updateQuoteStage(quoteId: string, stageId: string) {
  const { error } = await supabase
    .from("quotes")
    .update({ pipeline_stage_id: stageId } as any)
    .eq("id", quoteId);
  if (error) throw error;
}


// --- Products ---
export async function fetchProducts(userId: string): Promise<DbProduct[]> {
  try {
    // Seed defaults on first use (moved check to background or separate initialization if possible)
    // For now, keeping it here but wrapping in try-catch to not block products view
    const { count, error: countError } = await supabase.from("products").select("id", { count: "exact", head: true });
    
    if (!countError && count === 0) {
      console.info("[DataEngine] Seeding initial products for user:", userId);
      await supabase.rpc("seed_default_products", { p_user_id: userId });
    }

    const { data, error } = await supabase
      .from("products")
      .select("*, variants:product_variants(*)")
      .order("sort_order");
      
    if (error) {
      console.error("[DataEngine] Error fetching products:", error);
      throw error;
    }
    return data ?? [];
  } catch (err) {
    console.error("[DataEngine] Critical failure in fetchProducts:", err);
    throw err;
  }
}

export async function upsertProducts(userId: string, products: Partial<DbProduct>[]) {
  // Use upsert to preserve data and avoid deleting referenced products
  const rows = products.map((p, i) => ({
    user_id: userId,
    name: p.name ?? "",
    description: p.description ?? "",
    price: p.price ?? 0,
    cost: p.cost ?? 0,
    editable: p.editable ?? false,
    sort_order: i,
    stock_quantity: p.stock_quantity ?? 0,
    min_stock_level: p.min_stock_level ?? 5,
    category: p.category ?? "Geral",
    sku: p.sku ?? null,
    image_url: p.image_url ?? null,
    ...(p.compare_at_price !== undefined ? { compare_at_price: p.compare_at_price } : {}),
    ...(p.made_to_order !== undefined ? { made_to_order: p.made_to_order } : {}),
    ...(p.lead_time_days !== undefined ? { lead_time_days: p.lead_time_days } : {}),
    is_digital: p.is_digital ?? false,
    hidden: p.hidden ?? false,
    ...(p.id ? { id: p.id } : {}),
  }));
  const { error } = await supabase.from("products").upsert(rows as any, { onConflict: "id" });
  if (error) throw error;
}

export async function deleteProduct(productId: string) {
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) throw error;
}

export async function createProduct(userId: string, product: Partial<DbProduct>) {
  const row = {
    user_id: userId,
    name: product.name ?? "",
    description: product.description ?? "",
    price: product.price ?? 0,
    cost: product.cost ?? 0,
    editable: product.editable ?? true,
    sort_order: 999,
    stock_quantity: product.stock_quantity ?? 0,
    min_stock_level: product.min_stock_level ?? 5,
    category: product.category ?? "Geral",
    sku: product.sku ?? null,
    image_url: product.image_url ?? null,
    compare_at_price: product.compare_at_price ?? null,
    made_to_order: product.made_to_order ?? false,
    lead_time_days: product.lead_time_days ?? null,
    is_digital: product.is_digital ?? false,
    hidden: product.hidden ?? false,
  };
  const { data, error } = await supabase.from("products").insert(row as any).select().single();
  if (error) throw error;
  return data;
}


// --- Clients ---
export async function fetchClients(): Promise<DbClient[]> {
  const { data, error } = await supabase.from("clients").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function upsertClient(userId: string, client: { id?: string; name: string; phone?: string; notes?: string; cnpj_cpf?: string; address?: string; address_number?: string; address_complement?: string; cep?: string }): Promise<DbClient> {
  const payload: any = {
    name: client.name,
    phone: client.phone || null,
    notes: client.notes || null,
    cnpj_cpf: client.cnpj_cpf || null,
    address: client.address || null,
    address_number: client.address_number || null,
    address_complement: client.address_complement || null,
    cep: client.cep || null,
  };

  if (client.id) {
    const { data, error } = await supabase
      .from("clients")
      .update(payload)
      .eq("id", client.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  // Check if exists by name
  const { data: existing } = await supabase
    .from("clients")
    .select("*")
    .eq("name", client.name)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) {
    const { data, error } = await supabase
      .from("clients")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("clients")
    .insert({ user_id: userId, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteClient(id: string) {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}

// --- Quotes ---
export async function fetchQuotes(): Promise<FullQuote[]> {
  try {
    const { data: quotes, error } = await supabase
      .from("quotes")
      .select(`
        *,
        client:clients(*),
        items:quote_items(
          *,
          product:products(*),
          variant:product_variants(*)
        )
      `)
      .order("created_at", { ascending: false });
      
    if (error) {
      console.error("[DataEngine] Error fetching quotes:", error);
      throw error;
    }
    
    return (quotes ?? []).map((q: any) => ({
      ...q,
      client: q.client,
      items: q.items,
      status: q.status ?? "pendente",
      delivery_address: q.delivery_address ?? "",
      delivery_type: q.delivery_type,
      shipping_label_data: q.shipping_label_data,
      employee_signature_url: q.employee_signature_data,
      employee_name: q.employee_name,
      payment_method_type: q.payment_method_type,
      payment_date: q.payment_date,
      down_payment_paid_at: q.down_payment_paid_at,
      final_payment_paid_at: q.final_payment_paid_at
    }));
  } catch (err) {
    throw err;
  }
}

export async function updateQuotePayment(quoteId: string, paymentStatus: string, paymentDate: string | null) {
  const { error } = await supabase
    .from("quotes")
    .update({ 
      payment_status: paymentStatus,
      payment_date: paymentDate
    } as any)
    .eq("id", quoteId);
  if (error) throw error;
}

export async function updateQuotePartialPayment(
  quoteId: string, 
  field: "down_payment_paid_at" | "final_payment_paid_at", 
  value: string | null
) {
  const { error } = await supabase
    .from("quotes")
    .update({ [field]: value } as any)
    .eq("id", quoteId);
  if (error) throw error;
}

export async function updateQuoteFullPayment(quoteId: string, value: string | null) {
  const { error } = await supabase
    .from("quotes")
    .update({ 
      down_payment_paid_at: value,
      final_payment_paid_at: value,
      payment_date: value,
      payment_status: value ? "paid" : "pending"
    } as any)
    .eq("id", quoteId);
  if (error) throw error;
}

export async function updateQuoteStatus(quoteId: string, status: QuoteStatus) {
  const { data: quote, error: fetchError } = await supabase
    .from("quotes")
    .select("status, quote_items(product_id, variant_id, quantity)")
    .eq("id", quoteId)
    .single();

  if (fetchError) throw fetchError;

  // If approving and it wasn't approved before, decrease stock
  if (status === "aprovado" && quote.status !== "aprovado") {
    for (const item of (quote.quote_items as any[])) {
      if (item.variant_id) {
        // Atomic stock update for variants
        await supabase.rpc('increment_variant_stock', {
          p_variant_id: item.variant_id,
          p_amount: -item.quantity
        });
      } else if (item.product_id) {
        // Atomic stock update for products
        await supabase.rpc("increment_product_stock", { 
          p_product_id: item.product_id, 
          p_amount: -item.quantity 
        });
      }
    }
  } 
  // If moving FROM approved TO something else, restore stock
  else if (quote.status === "aprovado" && status !== "aprovado") {
    for (const item of (quote.quote_items as any[])) {
      if (item.variant_id) {
        await supabase.rpc('increment_variant_stock', {
          p_variant_id: item.variant_id,
          p_amount: item.quantity
        });
      } else if (item.product_id) {
        await supabase.rpc("increment_product_stock", { 
          p_product_id: item.product_id, 
          p_amount: item.quantity 
        });
      }
    }
  }

  const updateData: any = { status };
  if (status === "aprovado") {
    updateData.stage = "pendente";
  }

  const { error } = await supabase
    .from("quotes")
    .update(updateData)
    .eq("id", quoteId);
  if (error) throw error;
}

export async function saveFullQuote(
  userId: string,
  data: {
    id?: string;
    clientId: string;
    deliveryFee: number;
    deliveryRequired?: boolean;
    installationFee: number;
    installationRequired?: boolean;
    deliveryAddress: string;
    deadline: string;
    deliveryType?: string;
    items: { productId?: string; variantId?: string; productName: string; quantity: number; unitPrice: number; fixedCost?: number; unitDiscount?: number; unitDiscountType?: "fixed" | "percent" }[];
    employeeSignatureData?: string;
    employeeName?: string;
    discountAmount?: number;
    discountType?: "fixed" | "percent";
    isLead?: boolean;
    notes?: string;
    expectedBuyDate?: string;
    leadOrigin?: string;
    pipelineStageId?: string;
    downPayment?: number;
    remainingBalance?: number;
    paymentMethodType?: string;
  }
): Promise<string> {

  let quoteId = data.id;
  console.log("saveFullQuote - ID recebido:", quoteId);

  if (quoteId) {
    // Update existing
    const { error } = await supabase
      .from("quotes")
      .update({
        client_id: data.clientId,
        delivery_fee: data.deliveryFee,
        delivery_required: data.deliveryRequired ?? (data.deliveryFee > 0),
        installation_fee: data.installationFee,
        installation_required: data.installationRequired ?? (data.installationFee > 0),
        delivery_address: data.deliveryAddress,
        deadline: data.deadline,
        delivery_type: data.deliveryType || "entrega",
        employee_signature_data: data.employeeSignatureData,
        employee_name: data.employeeName,
        discount_amount: data.discountAmount || 0,
        discount_type: data.discountType || "fixed",
        is_lead: data.isLead ?? false,
        notes: data.notes || null,
        ...(data.leadOrigin !== undefined ? { lead_origin: data.leadOrigin || null } : {}),
        expected_buy_date: data.expectedBuyDate || null,
        pipeline_stage_id: data.pipelineStageId || null,
        down_payment: data.downPayment || 0,
        remaining_balance: data.remainingBalance || 0,
        payment_method_type: data.paymentMethodType || null,
      } as any)
      .eq("id", quoteId);
    if (error) {
      console.error("Error updating quote:", error);
      throw error;
    }
    // Remove old items
    await supabase.from("quote_items").delete().eq("quote_id", quoteId);
  } else {
    const { data: newQ, error: insertError } = await supabase
      .from("quotes")
      .insert({
        user_id: userId,
        client_id: data.clientId,
        source: "manual",
        lead_origin: data.leadOrigin || null,
        delivery_fee: data.deliveryFee,
        delivery_required: data.deliveryRequired ?? (data.deliveryFee > 0),
        installation_fee: data.installationFee,
        installation_required: data.installationRequired ?? (data.installationFee > 0),
        delivery_address: data.deliveryAddress,
        deadline: data.deadline,
        delivery_type: data.deliveryType || "entrega",
        order_token: Math.random().toString(36).substring(2, 8).toUpperCase(),
        employee_signature_data: data.employeeSignatureData,
        employee_name: data.employeeName,
        discount_amount: data.discountAmount || 0,
        discount_type: data.discountType || "fixed",
        is_lead: data.isLead ?? false,
        notes: data.notes || null,
        expected_buy_date: data.expectedBuyDate || null,
        pipeline_stage_id: data.pipelineStageId || null,
        down_payment: data.downPayment || 0,
        remaining_balance: data.remainingBalance || 0,
        payment_method_type: data.paymentMethodType || null,
      } as any)
      .select()
      .single();
    if (insertError) {
      console.error("Error inserting quote:", insertError);
      throw insertError;
    }
    quoteId = newQ.id;
  }

  // Insert items and update stock if approved
  if (data.items.length > 0) {
    const rows = data.items.map((item) => {
      // Garantir que unitPrice seja um número válido e não NaN ou undefined
      const safeUnitPrice = typeof item.unitPrice === 'number' && !isNaN(item.unitPrice) 
        ? item.unitPrice 
        : 0;

      return {
        quote_id: quoteId!,
        product_id: item.productId || null,
        variant_id: item.variantId || null,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: safeUnitPrice,
        unit_discount: Number(item.unitDiscount) || 0,
        unit_discount_type: item.unitDiscountType || "fixed",

        fixed_cost: Number(item.fixedCost) || 0
      };
    });

    const { error } = await supabase.from("quote_items").insert(rows as any);
    if (error) {
      console.error("Error inserting quote items:", error);
      throw error;
    }
  }

  return quoteId!;
}

export async function saveProductVariant(variant: { product_id: string; name: string; sku?: string; price_adjustment?: number; stock_quantity?: number; min_stock_level?: number }) {
  const { error } = await supabase.from("product_variants").insert(variant);
  if (error) throw error;
}

export async function deleteProductVariant(variantId: string) {
  const { error } = await supabase.from("product_variants").delete().eq("id", variantId);
  if (error) throw error;
}

export async function deleteQuoteById(id: string) {
  const { error } = await supabase.from("quotes").delete().eq("id", id);
  if (error) throw error;
}

// --- Expenses ---
export async function fetchExpenses(): Promise<DbExpense[]> {
  const { data, error } = await supabase
    .from("direct_expenses")
    .select("*")
    .order("expense_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveExpense(expense: Partial<DbExpense>) {
  if (!expense.user_id) throw new Error("user_id is required");
  const { error } = await supabase
    .from("direct_expenses")
    .upsert(expense as any);
  if (error) throw error;
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from("direct_expenses").delete().eq("id", id);
  if (error) throw error;
}

// --- Profit Withdrawals ---
export async function fetchProfitWithdrawals(): Promise<DbProfitWithdrawal[]> {
  const { data, error } = await supabase
    .from("profit_withdrawals")
    .select("*")
    .order("withdrawal_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveProfitWithdrawal(withdrawal: Partial<DbProfitWithdrawal>) {
  if (!withdrawal.user_id) throw new Error("user_id is required");
  const { error } = await supabase
    .from("profit_withdrawals")
    .upsert(withdrawal as any);
  if (error) throw error;
}

export async function deleteProfitWithdrawal(id: string) {
  const { error } = await supabase.from("profit_withdrawals").delete().eq("id", id);
  if (error) throw error;
}

// --- Business Settings ---
export async function fetchBusinessSettings(userId: string): Promise<DbBusinessSettings | null> {
  const { data, error } = await supabase
    .from("business_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertBusinessSettings(userId: string, settings: { tax_rate: number; monthly_expenses: number; logo_url?: string | null; nubank_pix_key?: string | null; nubank_pix_name?: string | null; manual_balance?: number }) {
  const { error } = await supabase
    .from("business_settings")
    .upsert({
      user_id: userId,
      tax_rate: settings.tax_rate,
      monthly_expenses: settings.monthly_expenses,
      logo_url: settings.logo_url,
      nubank_pix_key: settings.nubank_pix_key,
      nubank_pix_name: settings.nubank_pix_name,
      manual_balance: settings.manual_balance
    }, { onConflict: "user_id" });
  if (error) throw error;
}

// --- Sales Targets ---
export async function fetchSalesTargets(userId: string): Promise<DbSalesTarget[]> {
  const { data, error } = await supabase
    .from("sales_targets")
    .select("*")
    .eq("user_id", userId)
    .order("year", { ascending: false })
    .order("month", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function upsertSalesTarget(userId: string, target: { month: number; year: number; target_amount: number }) {
  const { error } = await supabase
    .from("sales_targets")
    .upsert({
      user_id: userId,
      month: target.month,
      year: target.year,
      target_amount: target.target_amount,
    }, { onConflict: "user_id,month,year" });
  if (error) throw error;
}

// --- DRE Metrics ---
export interface DreMetrics {
  receita_bruta: number;
  receita_produtos: number;
  receita_servicos: number;
  impostos: number;
  receita_liquida: number;
  custo_mercadoria: number;
  lucro_bruto: number;
  despesas_variaveis: number;
  despesas_fixas: number;
  resultado_liquido: number;
  pipeline: number;
  vendas_count: number;
  margem_liquida: number;
}

export async function fetchDreMetrics(userId: string, startDate: string, endDate: string): Promise<DreMetrics> {
  const { data, error } = await supabase.rpc("get_dre_metrics", {
    p_user_id: userId,
    p_start_date: startDate,
    p_end_date: endDate
  });
  if (error) throw error;
  return data as unknown as DreMetrics;
}

// --- CRM & Follow-up ---
export async function markFollowUp(quoteId: string) {
  const { error } = await supabase.rpc("mark_follow_up", { p_quote_id: quoteId });
  if (error) throw error;
}

export interface ClientInsight {
  client_id: string;
  client_name: string;
  client_phone: string | null;
  total_quotes: number;
  approved_quotes: number;
  total_revenue: number;
  average_ticket: number;
  last_order_date: string | null;
}

export async function fetchClientInsights(): Promise<ClientInsight[]> {
  const { data, error } = await supabase.from("v_client_insights").select("*");
  if (error) throw error;
  return data ?? [];
}

// Access Control & Profiles
export async function fetchProfiles(): Promise<DbProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return (data as any[]) || [];
}

export async function updateProfile(id: string, updates: Partial<DbProfile>): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id);
  
  if (error) throw error;
}

export async function fetchAllowedEmails(): Promise<AllowedEmail[]> {
  const { data, error } = await supabase
    .from('allowed_emails')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return (data as any[]) || [];
}

export async function addAllowedEmail(email: string): Promise<void> {
  const { error } = await supabase
    .from('allowed_emails')
    .insert([{ email }]);
  
  if (error) throw error;
}

export async function removeAllowedEmail(email: string): Promise<void> {
  const { error } = await supabase
    .from('allowed_emails')
    .delete()
    .eq('email', email);
  
  if (error) throw error;
}

// --- Activity Logs ---
export async function fetchActivityLogs(): Promise<DbActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  
  if (error) throw error;
  return data || [];
}

// --- Cash Flow ---
export async function fetchCashFlowTransactions(userId: string): Promise<DbCashFlow[]> {
  const { data, error } = await supabase
    .from("cash_flow_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("transaction_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveCashFlowTransaction(transaction: Partial<DbCashFlow>) {
  if (!transaction.user_id) throw new Error("user_id is required");
  const { error } = await supabase
    .from("cash_flow_transactions")
    .upsert(transaction as any);
  if (error) throw error;
}

export async function deleteCashFlowTransaction(id: string) {
  // Defensive check for virtual IDs from useFinance hook
  if (id.startsWith('down-') || id.startsWith('final-') || id.startsWith('total-')) {
    console.warn("[DataEngine] Attempted to delete a virtual transaction:", id);
    return;
  }
  
  const { error } = await supabase.from("cash_flow_transactions").delete().eq("id", id);
  if (error) throw error;
}

// --- Financial Categories ---
export async function fetchFinancialCategories(userId: string): Promise<DbFinancialCategory[]> {
  const { data, error } = await supabase
    .from("financial_categories")
    .select("*")
    .eq("user_id", userId)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function saveFinancialCategory(category: Partial<DbFinancialCategory>) {
  if (!category.user_id) throw new Error("user_id is required");
  const { error } = await supabase
    .from("financial_categories")
    .upsert(category as any);
  if (error) throw error;
}

export async function deleteFinancialCategory(id: string) {
  const { error } = await supabase.from("financial_categories").delete().eq("id", id);
  if (error) throw error;
}

export async function logActivity(action: string, entityType: string, entityId?: string, details?: any) {
  await supabase.rpc('log_activity', {
    p_action: action,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_details: details
  });
}

export async function hideProduct(productId: string, hidden: boolean = true) {
  const { error } = await supabase.from("products").update({ hidden } as any).eq("id", productId);
  if (error) throw error;
}

// --- Investors ---
export async function fetchInvestors(): Promise<DbInvestor[]> {
  const { data, error } = await supabase.from("investors").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function saveInvestor(investor: Partial<DbInvestor>) {
  const { error } = await supabase.from("investors").upsert(investor as any);
  if (error) throw error;
}

export async function deleteInvestor(id: string) {
  const { error } = await supabase.from("investors").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchInvestorTransactions(investorId?: string): Promise<DbInvestorTransaction[]> {
  let query = supabase.from("investor_transactions").select("*").order("date", { ascending: false });
  if (investorId) query = query.eq("investor_id", investorId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function saveInvestorTransaction(tx: Partial<DbInvestorTransaction>) {
  const { error } = await supabase.from("investor_transactions").upsert(tx as any);
  if (error) throw error;
}

export async function deleteInvestorTransaction(id: string) {
  const { error } = await supabase.from("investor_transactions").delete().eq("id", id);
  if (error) throw error;
}



