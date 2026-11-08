import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { decideWithdrawal, fetchWithdrawalRequests, formatBRL, WITHDRAWAL_STATUS_LABEL } from "@/lib/investorPanel";
import { PushCard } from "@/pages/InvestorPanelPage";

/** Pedidos de saque dos investidores, para o administrador confirmar o Pix ou recusar. */
export function WithdrawalRequestsAdmin() {
  const qc = useQueryClient();
  const { data: requests = [], isLoading } = useQuery({ queryKey: ["withdrawal-requests"], queryFn: fetchWithdrawalRequests, refetchOnWindowFocus: true });
  const [refusing, setRefusing] = useState<string | null>(null);
  const [refuseNote, setRefuseNote] = useState("");

  const decide = useMutation({
    mutationFn: ({ id, paid, note }: { id: string; paid: boolean; note?: string }) => decideWithdrawal(id, paid, note),
    onSuccess: (_d, v) => {
      toast.success(v.paid ? "Saque marcado como pago e lançado no extrato." : "Pedido recusado.");
      setRefusing(null);
      setRefuseNote("");
      qc.invalidateQueries({ queryKey: ["withdrawal-requests"] });
      qc.invalidateQueries({ queryKey: ["investor-transactions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = requests.filter((r) => r.status === "pendente");
  const recent = requests.filter((r) => r.status !== "pendente").slice(0, 5);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Chave Pix copiada.");
    } catch {
      toast.error("Não foi possível copiar. Selecione e copie manualmente.");
    }
  };

  return (
    <section className="space-y-4 min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-lg font-black text-slate-900">Pedidos de saque</h3>
          <p className="text-sm text-slate-500">Faça o Pix e marque como pago: o valor entra como retirada no extrato do investidor.</p>
        </div>
        {pending.length > 0 && <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-100 text-amber-700">{pending.length} aguardando</span>}
      </div>

      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      ) : pending.length === 0 ? (
        <p className="text-sm text-slate-500 p-4 rounded-2xl border border-dashed border-slate-200">Nenhum pedido aguardando.</p>
      ) : (
        <div className="space-y-2">
          {pending.map((r) => (
            <div key={r.id} className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-black text-slate-900">{r.investor?.name ?? "Investidor"} · <span className="tabular-nums">{formatBRL(r.amount)}</span></p>
                <p className="text-xs text-slate-600 break-words">
                  Pedido em {new Date(r.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  {r.note ? ` · "${r.note}"` : ""}
                </p>
                {r.pix_key && (
                  <button type="button" onClick={() => copy(r.pix_key!)} className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline break-all text-left">
                    <Copy className="w-3 h-3 shrink-0" /> Pix: {r.pix_key}
                  </button>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" className="rounded-xl" disabled={decide.isPending} onClick={() => setRefusing(r.id)}>
                  <X className="w-4 h-4 mr-1" /> Recusar
                </Button>
                <Button className="rounded-xl font-black bg-emerald-600 hover:bg-emerald-700" disabled={decide.isPending} onClick={() => decide.mutate({ id: r.id, paid: true })}>
                  <Check className="w-4 h-4 mr-1" /> Já paguei
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Últimos decididos</p>
          {recent.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 text-sm py-1">
              <span className="text-slate-600 min-w-0 truncate">{r.investor?.name} · {new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="tabular-nums font-bold">{formatBRL(r.amount)}</span>
                <span className={cn("text-xs font-bold", r.status === "pago" ? "text-emerald-600" : "text-slate-400")}>{WITHDRAWAL_STATUS_LABEL[r.status]}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <PushCard title="Aviso de pedidos de saque" description="Receba uma notificação quando um investidor pedir saque." />

      <Dialog open={!!refusing} onOpenChange={(o) => !o && setRefusing(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6 w-[calc(100vw-1.5rem)]">
          <DialogHeader>
            <DialogTitle>Recusar pedido de saque</DialogTitle>
            <DialogDescription>O investidor vê o motivo no painel dele.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="refuse-note">Motivo</Label>
            <Input id="refuse-note" value={refuseNote} onChange={(e) => setRefuseNote(e.target.value)} placeholder="Ex.: vamos pagar junto com o fechamento do mês" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setRefusing(null)}>Voltar</Button>
            <Button variant="destructive" disabled={decide.isPending} onClick={() => refusing && decide.mutate({ id: refusing, paid: false, note: refuseNote })}>
              Recusar pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
