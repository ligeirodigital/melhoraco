import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatQuote";
import { Sparkles, ShoppingCart, TrendingUp } from "lucide-react";

interface UpsellSectionProps {
  quoteId: string;
  token: string | null | undefined;
}

type Suggestion = {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
  description?: string | null;
  freq: number;
};

export function UpsellSection({ quoteId, token }: UpsellSectionProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["upsell", quoteId, token],
    enabled: !!quoteId && !!token,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_upsell_suggestions" as any, {
        p_quote_id: quoteId,
        p_token: token,
      });
      if (error) throw error;
      return (data as Suggestion[]) || [];
    },
  });

  if (isLoading || !data || data.length === 0) return null;

  return (
    <div className="mt-6 p-6 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-2xl">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-sm">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h4 className="font-black text-slate-900 text-sm tracking-tight">Clientes também levaram</h4>
          <p className="text-[11px] text-slate-500 font-medium">Sugestões baseadas em outros projetos aprovados</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {data.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-xl p-3 border border-orange-100/60 hover:border-orange-300 hover:shadow-md transition-all"
          >
            <div className="aspect-square w-full mb-2 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <ShoppingCart className="w-8 h-8 text-slate-300" />
              )}
            </div>
            <p className="font-bold text-slate-900 text-xs line-clamp-2 leading-tight min-h-[2rem]">{p.name}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-black text-orange-600 text-sm">{formatCurrency(Number(p.price) || 0)}</span>
              {p.freq > 0 && (
                <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 uppercase tracking-wide">
                  <TrendingUp className="w-3 h-3" />
                  {p.freq}x
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-500 mt-3 text-center italic">
        Quer adicionar algum destes? Fale com o vendedor pelo WhatsApp abaixo 👇
      </p>
    </div>
  );
}
