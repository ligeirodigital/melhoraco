import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Loader2, ExternalLink, Radio } from "lucide-react";
import { toast } from "sonner";
import { brl, orderStatusLabel } from "@/lib/storeHelpers";
import { POLL, isOrderFinal, queryKeys } from "@/lib/queryKeys";

type Order = {
  id: string;
  created_at: string;
  status: string | null;
  payment_status: string | null;
  order_nsu: string | null;
  token: string;
  client_name: string;
  total: number;
  items_summary: string | null;
};

export default function StoreTrackPage() {
  const [phone, setPhone] = useState("");
  const [idFilter, setIdFilter] = useState("");
  const [activePhone, setActivePhone] = useState<string>("");

  useEffect(() => { document.title = "Rastrear pedido — Melhoraço"; }, []);

  useEffect(() => {
    const saved = localStorage.getItem("melhoraco_customer_phone");
    if (saved) { setPhone(saved); setActivePhone(saved.replace(/\D/g, "")); }
  }, []);

  const ordersQuery = useQuery({
    queryKey: queryKeys.publicClientOrders(activePhone),
    enabled: activePhone.length >= 10,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_client_orders", { p_phone: activePhone });
      if (error) throw error;
      return (data as any as Order[]) || [];
    },
    // Poll só enquanto existir pedido em estado não-final e a aba estiver visível.
    refetchInterval: (query) => {
      const rows = query.state.data as Order[] | undefined;
      if (!rows || rows.length === 0) return false;
      return rows.every(isOrderFinal) ? false : POLL.orders;
    },
    refetchIntervalInBackground: false,
  });

  const orders = ordersQuery.data ?? null;
  const loading = ordersQuery.isFetching && !ordersQuery.data;
  const live = activePhone.length >= 10 && !!ordersQuery.data;
  const lastUpdate = ordersQuery.dataUpdatedAt ? new Date(ordersQuery.dataUpdatedAt) : null;

  useEffect(() => {
    if (ordersQuery.error) toast.error("Erro ao buscar pedidos");
  }, [ordersQuery.error]);

  const search = () => {
    const value = phone.replace(/\D/g, "");
    if (value.length < 10) { toast.error("Telefone inválido"); return; }
    localStorage.setItem("melhoraco_customer_phone", value);
    setActivePhone(value);
    if (value === activePhone) ordersQuery.refetch();
  };

  const filtered = useMemo(() => {
    if (!orders) return null;
    const q = idFilter.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      (o.order_nsu ?? "").toLowerCase().includes(q) || o.id.toLowerCase().includes(q)
    );
  }, [orders, idFilter]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[#0f172a] text-white border-b border-orange-500/40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Radio className={`w-5 h-5 ${live ? "text-green-400 animate-pulse" : "text-white/40"}`} />
              Rastrear pedido
            </h1>
            <p className="text-xs text-white/60">
              {live && lastUpdate
                ? `Atualizando em tempo real · ${lastUpdate.toLocaleTimeString("pt-BR")}`
                : "Consulte por telefone e ID do pedido"}
            </p>
          </div>
          <Link to="/loja">
            <Button variant="secondary" size="sm" className="bg-orange-500 hover:bg-orange-600 text-white border-0">
              <ArrowLeft className="w-4 h-4 mr-2" /> Loja
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="grid gap-2 sm:grid-cols-[1fr,1fr,auto]">
          <Input
            placeholder="Telefone (com DDD)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            maxLength={20}
          />
          <Input
            placeholder="Filtrar por Nº ou ID do pedido (opcional)"
            value={idFilter}
            onChange={(e) => setIdFilter(e.target.value)}
          />
          <Button onClick={() => search()} disabled={loading} className="bg-orange-500 hover:bg-orange-600">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-2" /> Buscar</>}
          </Button>
        </div>

        {filtered === null ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            Informe seu telefone para acompanhar seus pedidos
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            Nenhum pedido encontrado
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => {
              const s = orderStatusLabel(o.status, o.payment_status);
              return (
                <div key={o.id} className="border rounded-lg p-4 bg-card">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-muted-foreground">
                          #{o.order_nsu || o.id.slice(0, 8)}
                        </span>
                        <Badge className={`${s.color} text-white border-0`}>{s.label}</Badge>
                      </div>
                      <p className="text-sm mt-1 text-muted-foreground line-clamp-2">
                        {o.items_summary || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(o.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-600">{brl(o.total)}</p>
                      <Link to={`/p/q_${o.id}_${o.token}`}>
                        <Button size="sm" variant="outline" className="mt-2">
                          <ExternalLink className="w-3 h-3 mr-1" /> Detalhes
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
