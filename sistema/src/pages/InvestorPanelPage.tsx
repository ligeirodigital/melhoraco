import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Bell, BellRing, Loader2, Share, Wallet } from "lucide-react";
import { toast } from "sonner";
import { MainLayout } from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  cancelWithdrawal,
  fetchMyInvestorPanel,
  formatBRL,
  monthLabel,
  requestWithdrawal,
  WITHDRAWAL_STATUS_LABEL,
  type WithdrawalStatus,
} from "@/lib/investorPanel";
import { enablePush, getPushSupport, isPushEnabled } from "@/lib/push";

const STATUS_STYLE: Record<WithdrawalStatus, string> = {
  pendente: "bg-amber-50 text-amber-700 border-amber-200",
  pago: "bg-emerald-50 text-emerald-700 border-emerald-200",
  recusado: "bg-rose-50 text-rose-700 border-rose-200",
  cancelado: "bg-slate-50 text-slate-500 border-slate-200",
};

const PIX_KEY_STORAGE = "melhoraco:ultima-chave-pix";

export default function InvestorPanelPage() {
  const qc = useQueryClient();
  const panelQuery = useQuery({ queryKey: ["my-investor-panel"], queryFn: fetchMyInvestorPanel, refetchOnWindowFocus: true, staleTime: 30_000 });
  const panel = panelQuery.data;

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [note, setNote] = useState("");

  const currentMonth = new Date().toISOString().slice(0, 7);

  const openWithdraw = () => {
    if (!panel) return;
    setAmount(panel.available > 0 ? panel.available.toFixed(2) : "");
    try { setPixKey(localStorage.getItem(PIX_KEY_STORAGE) ?? ""); } catch { /* sem armazenamento */ }
    setNote("");
    setWithdrawOpen(true);
  };

  const withdrawMutation = useMutation({
    mutationFn: () => requestWithdrawal(Number(String(amount).replace(",", ".")), pixKey, note),
    onSuccess: () => {
      try { localStorage.setItem(PIX_KEY_STORAGE, pixKey); } catch { /* sem armazenamento */ }
      toast.success("Pedido de saque enviado. Você recebe aviso quando o Pix for feito.");
      setWithdrawOpen(false);
      qc.invalidateQueries({ queryKey: ["my-investor-panel"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelWithdrawal(id),
    onSuccess: () => {
      toast.success("Pedido cancelado.");
      qc.invalidateQueries({ queryKey: ["my-investor-panel"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Extrato: participação mensal (crédito) + aportes/retiradas, mais recente primeiro.
  const statement = useMemo(() => {
    if (!panel) return [];
    const rows = [
      ...panel.months.map((m) => ({
        id: `m-${m.month}`,
        date: `${m.month}-01T12:00:00`,
        title: `Comissão de ${monthLabel(m.month)}${m.month === currentMonth ? " (parcial)" : ""}`,
        detail: `${m.share_percentage}% de ${formatBRL(m.net_profit)} de lucro`,
        amount: m.amount,
        credit: true,
      })),
      ...panel.transactions.map((t) => ({
        id: t.id,
        date: t.date,
        title: t.description || (t.type === "deposit" ? "Aporte" : "Retirada"),
        detail: new Date(t.date).toLocaleDateString("pt-BR"),
        amount: t.amount,
        credit: t.type === "deposit",
      })),
    ];
    return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [panel, currentMonth]);

  if (panelQuery.isLoading) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </MainLayout>
    );
  }

  if (panelQuery.isError || !panel) {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto py-16 text-center space-y-3">
          <h1 className="text-2xl font-black text-slate-900">Painel de comissão indisponível</h1>
          <p className="text-slate-500">
            {panelQuery.isError ? "Não conseguimos carregar seus dados agora. Tente de novo em instantes." : "Seu login ainda não está vinculado a um investidor. Peça ao administrador para fazer o vínculo."}
          </p>
          {panelQuery.isError && <Button onClick={() => panelQuery.refetch()}>Tentar de novo</Button>}
        </div>
      </MainLayout>
    );
  }

  const thisMonth = panel.months.find((m) => m.month === currentMonth);
  const pendingRequests = panel.requests.filter((r) => r.status === "pendente");

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-6 min-w-0">
        <header className="space-y-1">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Minha comissão</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Olá, {panel.investor.name}</h1>
          <p className="text-sm text-slate-500">Sua parte é {panel.investor.share_percentage}% do lucro de cada mês.</p>
        </header>

        {/* Saldo + saque */}
        <Card className="rounded-3xl border-slate-200 shadow-xl overflow-hidden">
          <CardContent className="p-6 sm:p-8 space-y-5">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Disponível para saque</p>
              <p className={cn("text-4xl sm:text-5xl font-black tabular-nums break-words", panel.available > 0 ? "text-emerald-600" : "text-slate-900")}>
                {formatBRL(panel.available)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Comissão deste mês</p>
                <p className="font-black tabular-nums text-slate-900">{formatBRL(thisMonth?.amount ?? 0)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Saques em análise</p>
                <p className="font-black tabular-nums text-slate-900">{formatBRL(panel.pending)}</p>
              </div>
            </div>
            <Button onClick={openWithdraw} disabled={panel.available <= 0} className="w-full h-14 rounded-2xl text-base font-black">
              <Wallet className="w-5 h-5 mr-2" /> Sacar
            </Button>
            {panel.available <= 0 && (
              <p className="text-xs text-slate-500 text-center">
                {panel.pending > 0 ? "Seu saldo está todo em pedidos de saque em análise." : "Ainda não há saldo para sacar."}
              </p>
            )}
            {panel.synced_at && (
              <p className="text-[11px] text-slate-400 text-center">
                Valores atualizados em {new Date(panel.synced_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}. O mês atual é parcial.
              </p>
            )}
          </CardContent>
        </Card>

        <PushCard />

        {/* Pedidos de saque */}
        {panel.requests.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Pedidos de saque</h2>
            <div className="space-y-2">
              {panel.requests.slice(0, 6).map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-slate-100 bg-white">
                  <div className="min-w-0">
                    <p className="font-black tabular-nums text-slate-900">{formatBRL(r.amount)}</p>
                    <p className="text-xs text-slate-500 break-words">
                      Pedido em {new Date(r.created_at).toLocaleDateString("pt-BR")}
                      {r.pix_key ? ` · Pix: ${r.pix_key}` : ""}
                      {r.decision_note ? ` · ${r.decision_note}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs font-bold px-3 py-1 rounded-full border", STATUS_STYLE[r.status])}>{WITHDRAWAL_STATUS_LABEL[r.status]}</span>
                    {r.status === "pendente" && (
                      <Button variant="ghost" size="sm" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate(r.id)}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {pendingRequests.length > 0 && <p className="text-xs text-slate-500">Quando o Pix for feito, o pedido muda para "Pago" e você recebe um aviso.</p>}
          </section>
        )}

        {/* Comissão por mês */}
        <section className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Comissão por mês</h2>
          {panel.months.length === 0 ? (
            <p className="text-sm text-slate-500 p-4 rounded-2xl border border-dashed border-slate-200">Ainda não há meses com lucro calculado.</p>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white divide-y divide-slate-100 overflow-hidden">
              {panel.months.map((m) => (
                <div key={m.month} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">{monthLabel(m.month)}{m.month === currentMonth && <span className="ml-2 text-xs font-bold text-amber-600">parcial</span>}</p>
                    <p className="text-xs text-slate-500">Lucro da empresa: {formatBRL(m.net_profit)}</p>
                  </div>
                  <p className="font-black tabular-nums text-emerald-600 whitespace-nowrap">{formatBRL(m.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Extrato */}
        <section className="space-y-3 pb-6">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Extrato</h2>
          <div className="space-y-2">
            {statement.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50/60 border border-slate-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", r.credit ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600")}>
                    {r.credit ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 break-words">{r.title}</p>
                    <p className="text-xs text-slate-500">{r.detail}</p>
                  </div>
                </div>
                <p className={cn("text-sm font-black tabular-nums whitespace-nowrap", r.credit ? "text-emerald-600" : "text-rose-600")}>
                  {r.credit ? "+" : "−"} {formatBRL(r.amount)}
                </p>
              </div>
            ))}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-white">
              <p className="text-sm font-black text-slate-900">Saldo total</p>
              <p className="text-sm font-black tabular-nums text-slate-900">{formatBRL(panel.balance)}</p>
            </div>
          </div>
        </section>
      </div>

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 w-[calc(100vw-1.5rem)]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Pedir saque</DialogTitle>
            <DialogDescription>Disponível: {formatBRL(panel.available)}. O pedido vai para aprovação e o Pix é feito pelo administrador.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              withdrawMutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="withdraw-amount">Valor (R$)</Label>
              <Input id="withdraw-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-12 text-lg font-bold" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="withdraw-pix">Chave Pix para receber</Label>
              <Input id="withdraw-pix" value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" className="h-12" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="withdraw-note">Observação (opcional)</Label>
              <Input id="withdraw-note" value={note} onChange={(e) => setNote(e.target.value)} className="h-12" />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="ghost" onClick={() => setWithdrawOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={withdrawMutation.isPending} className="font-black">
                {withdrawMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar pedido"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

/** Cartão para ativar o aviso de vendas no celular. */
export function PushCard({ title = "Aviso de vendas no celular", description = "Receba uma notificação a cada venda finalizada." }: { title?: string; description?: string }) {
  const support = getPushSupport();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    isPushEnabled().then(setEnabled).catch(() => setEnabled(false));
  }, []);

  const activate = async () => {
    setBusy(true);
    try {
      await enablePush();
      setEnabled(true);
      toast.success("Notificações ativadas neste aparelho.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="rounded-3xl border-slate-200">
      <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            {enabled ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <p className="font-black text-slate-900">{title}</p>
            {support === "ios-needs-install" ? (
              <p className="text-sm text-slate-500">
                No iPhone, primeiro toque em <Share className="inline w-4 h-4 -mt-1" /> <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>. Abra o sistema pelo ícone criado e volte aqui para ativar.
              </p>
            ) : support === "unsupported" ? (
              <p className="text-sm text-slate-500">Este navegador não aceita notificações. Use o Chrome no Android ou o Safari no iPhone.</p>
            ) : (
              <p className="text-sm text-slate-500">{enabled ? "Ativado neste aparelho." : description}</p>
            )}
          </div>
        </div>
        {support === "supported" && !enabled && (
          <Button onClick={activate} disabled={busy || enabled === null} className="rounded-2xl font-black shrink-0">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ativar avisos"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
