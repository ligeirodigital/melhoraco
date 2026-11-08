import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { brl, orderStatusLabel } from "@/lib/storeHelpers";

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

export default function StoreOrdersPage() {
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Meus pedidos — Melhoraço";
  }, []);

  const search = async (p?: string) => {
    const value = (p ?? phone).replace(/\D/g, "");
    if (value.length < 10) {
      toast.error("Telefone inválido");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("get_public_client_orders", { p_phone: value });
    setLoading(false);
    if (error) return toast.error("Erro ao buscar pedidos");
    setOrders((data as any as Order[]) || []);
    localStorage.setItem("melhoraco_customer_phone", value);
  };

  useEffect(() => {
    const saved = localStorage.getItem("melhoraco_customer_phone");
    if (saved) { setPhone(saved); search(saved); }
    // eslint-disable-next-line
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[#0f172a] text-white border-b border-orange-500/40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Meus pedidos</h1>
            <p className="text-xs text-white/60">Consulte seus pedidos pelo telefone</p>
          </div>
          <Link to="/loja">
            <Button variant="secondary" size="sm" className="bg-orange-500 hover:bg-orange-600 text-white border-0">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar à loja
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Telefone / WhatsApp (com DDD)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            maxLength={20}
          />
          <Button onClick={() => search()} disabled={loading} className="bg-orange-500 hover:bg-orange-600">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        {orders === null ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            Informe seu telefone para ver o histórico
          </p>
        ) : orders.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            Nenhum pedido encontrado para esse telefone
          </p>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => {
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
                          <ExternalLink className="w-3 h-3 mr-1" /> Ver
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
