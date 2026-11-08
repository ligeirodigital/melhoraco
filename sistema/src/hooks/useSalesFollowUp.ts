import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { FullQuote } from "@/types/models";

export function useSalesFollowUp() {
  const { user } = useAuth();
  const cache = useQueryClient();
  return useMutation({
    mutationFn: async (action: { quote: FullQuote; kind: "contact" | "payment" | "schedule" | "lost"; text?: string; date?: string | null; reason?: string | null }) => {
      if (!user) throw new Error("Entre na sua conta para continuar.");
      if (action.kind === "contact" || action.kind === "payment") {
        const { error } = await supabase.rpc("record_quote_whatsapp_contact", { p_quote_id: action.quote.id, p_content: action.text || "", p_type: action.kind === "contact" ? "follow_up_whatsapp" : "cobranca_pagamento" });
        if (error) throw error;
      } else {
        const patch = action.kind === "schedule" ? { next_follow_up_at: action.date || null } : { status: "recusado", lost_reason: action.reason || null };
        const { data, error } = await supabase.from("quotes").update(patch).eq("id", action.quote.id).eq("user_id", user.id).eq("status", "pendente").select("id").single();
        if (error || !data) throw error || new Error("Orçamento indisponível.");
      }
    },
    onSuccess: (_data, action) => {
      void cache.invalidateQueries({ queryKey: ["quotes"] });
      void cache.invalidateQueries({ queryKey: ["interactions", action.quote.client_id] });
      toast.success(action.kind === "lost" ? "Orçamento marcado como perdido." : action.kind === "schedule" ? "Retorno atualizado." : "Contato registrado. Confirme o envio no WhatsApp.");
    },
    onError: () => toast.error("Não foi possível salvar. Tente novamente; o histórico não foi atualizado."),
  });
}
