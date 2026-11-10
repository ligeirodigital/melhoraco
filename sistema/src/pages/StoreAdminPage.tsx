import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, RefreshCw, CheckCircle2, XCircle, Search, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { brl, orderStatusLabel } from "@/lib/storeHelpers";
import { CatalogManager } from "@/components/catalog/CatalogManager";
import { Link } from "react-router-dom";
import { confirmAction } from "@/lib/confirmAction";

type Row = {
  id: string;
  created_at: string;
  status: string | null;
  payment_status: string | null;
  payment_amount: number | null;
  order_nsu: string | null;
  client_view_token: string | null;
  notes: string | null;
  clients: { name: string | null; phone: string | null } | null;
  quote_items: { quantity: number; unit_price: number; products: { name: string } | null }[];
};

const STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Aguardando pagamento" },
  { value: "paid", label: "Pago" },
  { value: "confirmed", label: "Confirmado" },
  { value: "refused", label: "Recusado / Cancelado" },
  { value: "draft", label: "Rascunho" },
];

export default function StoreAdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("quotes")
      .select("id, created_at, status, payment_status, payment_amount, order_nsu, client_view_token, notes, clients(name,phone), quote_items(quantity, unit_price, products(name))")
      .eq("source", "store")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all") {
        const s = orderStatusLabel(r.status, r.payment_status);
        const map: Record<string, string> = {
          pending: "Aguardando pagamento", paid: "Pago",
          confirmed: "Confirmado", refused: "Recusado", draft: "Rascunho",
        };
        if (s.label !== map[statusFilter] && !(statusFilter === "refused" && ["Recusado"].includes(s.label))) {
          return false;
        }
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${r.clients?.name ?? ""} ${r.clients?.phone ?? ""} ${r.order_nsu ?? ""} ${r.id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, statusFilter, search]);

  const totalOf = (r: Row) =>
    r.quote_items.reduce((s, i) => s + i.quantity * Number(i.unit_price), 0);

  const confirmManually = async () => {
    if (!confirmTarget) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("quotes")
        .update({
          payment_status: "paid",
          payment_date: new Date().toISOString(),
          payment_amount: totalOf(confirmTarget),
          status: "aprovado",
        })
        .eq("id", confirmTarget.id);
      if (error) throw error;
      toast.success("Pedido confirmado manualmente");
      setConfirmTarget(null);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erro ao confirmar");
    } finally {
      setSaving(false);
    }
  };

  const rejectOrder = async (r: Row) => {
    if (!(await confirmAction({ title: "Recusar este pedido?", description: "O cliente vê o pedido como recusado.", confirmLabel: "Recusar", destructive: true }))) return;
    const { error } = await supabase
      .from("quotes")
      .update({ payment_status: "refused", status: "recusado" })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Pedido recusado");
    load();
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Pedidos da Loja</h1>
            <p className="text-sm text-muted-foreground">Origem: /loja · confirme manualmente quando necessário</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>

        <CatalogManager />

        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, telefone, NSU..."
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="border rounded-lg p-10 text-center text-muted-foreground">
            Nenhum pedido encontrado.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              const st = orderStatusLabel(r.status, r.payment_status);
              const total = totalOf(r);
              const isPaid = r.payment_status === "paid";
              return (
                <div key={r.id} className="border rounded-lg p-3 bg-card">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{r.clients?.name || "Sem nome"}</span>
                        <Badge className={`${st.color} text-white`}>{st.label}</Badge>
                        {r.order_nsu && (
                          <span className="text-xs font-mono text-muted-foreground">#{r.order_nsu}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.clients?.phone || "—"} · {new Date(r.created_at).toLocaleString("pt-BR")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {r.quote_items.map((i) => `${i.quantity}× ${i.products?.name ?? "item"}`).join(", ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{brl(total)}</p>
                      <div className="flex gap-1 mt-1 justify-end">
                        {r.client_view_token && (
                          <Link to={`/p/q_${r.id}_${r.client_view_token}`} target="_blank">
                            <Button size="sm" variant="ghost"><ExternalLink className="w-4 h-4" /></Button>
                          </Link>
                        )}
                        {!isPaid && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-700 border-green-300 hover:bg-green-50"
                              onClick={() => setConfirmTarget(r)}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" /> Confirmar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-700 border-red-300 hover:bg-red-50"
                              onClick={() => rejectOrder(r)}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!confirmTarget} onOpenChange={(v) => !v && setConfirmTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar pagamento manualmente?</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <p><b>Cliente:</b> {confirmTarget?.clients?.name}</p>
            <p><b>Total:</b> {confirmTarget ? brl(totalOf(confirmTarget)) : ""}</p>
            <p className="text-muted-foreground">
              Isto marca o pedido como pago e aprovado, sem passar pela InfinityPay.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTarget(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={confirmManually} disabled={saving} className="bg-green-600 hover:bg-green-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
