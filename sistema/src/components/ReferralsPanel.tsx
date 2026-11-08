// Painel de indicações — gera códigos vinculados a clientes e mostra performance.
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProjectData } from "@/hooks/useProjectData";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Loader2, Plus, Gift, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { reportError } from "@/lib/reportError";
import { formatCurrency } from "@/lib/formatQuote";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

function generateCode(name?: string) {
  const base = (name?.split(" ")[0] || "IND").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6) || "IND";
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${rand}`;
}

export function ReferralsPanel() {
  const { user } = useAuth();
  const { clients } = useProjectData();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    referrer_client_id: "",
    discount_pct: "5",
    reward_amount: "50",
  });

  const referrals = useQuery({
    queryKey: ["referrals", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const clientMap = useMemo(() => {
    const m = new Map<string, string>();
    (clients.data || []).forEach((c: any) => m.set(c.id, c.name));
    return m;
  }, [clients.data]);

  const stats = useMemo(() => {
    const list = referrals.data || [];
    const ativos = list.filter((r: any) => r.status === "ativo").length;
    const usados = list.filter((r: any) => r.status === "usado").length;
    const totalRecompensa = list
      .filter((r: any) => r.status === "usado")
      .reduce((a: number, r: any) => a + Number(r.reward_amount || 0), 0);
    return { ativos, usados, totalRecompensa };
  }, [referrals.data]);

  const create = async () => {
    if (!user || !form.referrer_client_id) {
      toast.error("Selecione um cliente indicador");
      return;
    }
    setSaving(true);
    try {
      const clientName = clientMap.get(form.referrer_client_id);
      const code = generateCode(clientName);
      const { error } = await supabase.from("referrals").insert({
        user_id: user.id,
        referrer_client_id: form.referrer_client_id,
        referral_code: code,
        discount_pct: Number(form.discount_pct) || 5,
        reward_amount: Number(form.reward_amount) || 0,
        status: "ativo",
      });
      if (error) throw error;
      toast.success(`Código ${code} criado`);
      await qc.invalidateQueries({ queryKey: ["referrals", user.id] });
      setOpen(false);
    } catch (e) {
      reportError(e, { scope: "referrals/create" });
    } finally {
      setSaving(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado");
  };

  const cancel = async (id: string) => {
    const { error } = await supabase.from("referrals").update({ status: "expirado" }).eq("id", id);
    if (error) return reportError(error, { scope: "referrals/cancel" });
    await qc.invalidateQueries({ queryKey: ["referrals", user!.id] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Gift className="w-6 h-6 text-primary" />
            Indicações
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Gere códigos únicos para clientes indicarem novos compradores.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo código
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-700 mb-1">Ativos</p>
          <p className="font-black text-3xl text-blue-900">{stats.ativos}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-1">Usados</p>
          <p className="font-black text-3xl text-emerald-900">{stats.usados}</p>
        </div>
        <div className="bg-slate-900 rounded-2xl p-5 text-white">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Recompensa gerada</p>
          <p className="font-black text-3xl text-primary">{formatCurrency(stats.totalRecompensa)}</p>
        </div>
      </div>

      <div className="bg-white border border-border rounded-3xl overflow-hidden divide-y divide-slate-100">
        {referrals.isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (referrals.data || []).length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">Nenhum código criado ainda.</div>
        ) : (
          referrals.data!.map((r: any) => (
            <div key={r.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <code className="font-black text-lg tracking-widest">{r.referral_code}</code>
                  <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border", {
                    "bg-emerald-50 text-emerald-700 border-emerald-200": r.status === "ativo",
                    "bg-slate-100 text-slate-600 border-slate-200": r.status === "usado",
                    "bg-rose-50 text-rose-600 border-rose-200": r.status === "expirado",
                  })}>
                    {r.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Indicador: {clientMap.get(r.referrer_client_id) || "—"} · Desconto: {r.discount_pct}% · Recompensa: {formatCurrency(r.reward_amount)}
                  {r.used_at && ` · Usado em ${format(new Date(r.used_at), "dd/MM/yyyy")}`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {r.status === "usado" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                <Button size="icon" variant="ghost" onClick={() => copyCode(r.referral_code)} className="h-8 w-8">
                  <Copy className="w-4 h-4" />
                </Button>
                {r.status === "ativo" && (
                  <Button size="icon" variant="ghost" onClick={() => cancel(r.id)} className="h-8 w-8 text-rose-500">
                    <XCircle className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo código de indicação</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Cliente indicador</Label>
              <Select value={form.referrer_client_id} onValueChange={(v) => setForm({ ...form, referrer_client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Escolha um cliente" /></SelectTrigger>
                <SelectContent>
                  {(clients.data || []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Desconto (%)</Label>
                <Input type="number" value={form.discount_pct} onChange={(e) => setForm({ ...form, discount_pct: e.target.value })} />
              </div>
              <div>
                <Label>Recompensa (R$)</Label>
                <Input type="number" value={form.reward_amount} onChange={(e) => setForm({ ...form, reward_amount: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={create} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando...</> : "Criar código"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
