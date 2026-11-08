
import React, { useState } from "react";
import { useFinance } from "@/hooks/useFinance";
import { useFinanceData } from "@/hooks/useFinanceData";
import { cn } from "@/lib/utils";
import { 
  TrendingUp, TrendingDown, Wallet, ArrowUpRight, 
  ArrowDownRight, Plus, History, User, Trash2, Edit2, Settings2, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Investor } from "@/types/finance";
import { WithdrawalRequestsAdmin } from "./WithdrawalRequestsAdmin";

export const InvestorModule = () => {
  const { investors, investorTransactions, investorProfitShares, investorProfitSharesByMonth } = useFinance(undefined, undefined, { withInvestorShares: true });
  const [statementInvestorId, setStatementInvestorId] = useState<string | null>(null);
  const { mutations } = useFinanceData();
  
  // Transaction Form State
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [selectedInvestorId, setSelectedInvestorId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"deposit" | "withdrawal">("withdrawal");
  const [description, setDescription] = useState("");
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  // Investor CRUD State
  const [showInvestorForm, setShowInvestorForm] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<Partial<Investor> | null>(null);
  const [investorName, setInvestorName] = useState("");
  const [investorShare, setInvestorShare] = useState("");

  const getInvestorBalance = (investorId: string) => {
    const transactionBalance = (investorTransactions || [])
      .filter(t => t.investor_id === investorId)
      .reduce((acc, t) => acc + (t.type === 'deposit' ? Number(t.amount) : -Number(t.amount)), 0);
    
    const profitShare = investorProfitShares?.[investorId] || 0;
    
    return transactionBalance + profitShare;
  };

  const handleSaveTransaction = async () => {
    if (!selectedInvestorId || !amount || !description) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      await mutations.addInvestorTransaction.mutateAsync({
        id: editingTransactionId || undefined,
        investor_id: selectedInvestorId,
        amount: Number(amount),
        type,
        description,
        date: new Date().toISOString()
      });
      closeTransactionForm();
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditTransaction = (t: any) => {
    setEditingTransactionId(t.id);
    setSelectedInvestorId(t.investor_id);
    setAmount(t.amount.toString());
    setType(t.type);
    setDescription(t.description);
    setShowTransactionForm(true);
  };

  const closeTransactionForm = () => {
    setShowTransactionForm(false);
    setEditingTransactionId(null);
    setAmount("");
    setDescription("");
    setSelectedInvestorId("");
  };

  const handleDeleteTransaction = async (id: string) => {
    if (confirm("Deseja realmente excluir este lançamento?")) {
      await mutations.removeInvestorTransaction.mutateAsync(id);
    }
  };

  const handleSaveInvestor = async () => {
    if (!investorName || !investorShare) {
      toast.error("Preencha o nome e a porcentagem");
      return;
    }

    try {
      await mutations.addInvestor.mutateAsync({
        id: editingInvestor?.id,
        name: investorName,
        share_percentage: Number(investorShare)
      });
      closeInvestorForm();
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditInvestor = (investor: Investor) => {
    setEditingInvestor(investor);
    setInvestorName(investor.name);
    setInvestorShare(investor.share_percentage.toString());
    setShowInvestorForm(true);
  };

  const closeInvestorForm = () => {
    setShowInvestorForm(false);
    setEditingInvestor(null);
    setInvestorName("");
    setInvestorShare("");
  };

  const handleDeleteInvestor = async (id: string) => {
    const hasTransactions = investorTransactions.some(t => t.investor_id === id);
    if (hasTransactions) {
      toast.error("Não é possível excluir um investidor com movimentações registradas.");
      return;
    }

    if (confirm("Deseja realmente excluir este investidor?")) {
      await mutations.removeInvestor.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 min-w-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">Módulo de Investidores</h2>
          <p className="text-sm sm:text-base text-slate-500">Gestão de saldos, retiradas e investidores.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Button variant="outline" onClick={() => setShowInvestorForm(true)} className="rounded-2xl h-12 px-4 sm:px-6 font-bold border-slate-200 text-xs sm:text-sm">
            <Users className="w-5 h-5 mr-2 text-slate-400" /> GERENCIAR INVESTIDORES
          </Button>
          <Button onClick={() => setShowTransactionForm(true)} className="rounded-2xl h-12 px-4 sm:px-6 font-bold shadow-lg shadow-primary/20 text-xs sm:text-sm">
            <Plus className="w-5 h-5 mr-2" /> NOVO LANÇAMENTO
          </Button>
        </div>
      </div>

      <Card className="rounded-3xl sm:rounded-[2.5rem] border-slate-200/60 shadow-xl min-w-0">
        <CardContent className="p-4 sm:p-8">
          <WithdrawalRequestsAdmin />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {investors.map(investor => {
          const balance = getInvestorBalance(investor.id);
          return (
            <Card key={investor.id} className="rounded-3xl sm:rounded-[2.5rem] border-slate-200/60 shadow-xl overflow-hidden group hover:border-primary/20 transition-all duration-500 min-w-0">
              <CardHeader className="bg-slate-50/50 p-4 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-primary shrink-0">
                    <User className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg sm:text-xl font-black text-slate-900 truncate">{investor.name}</CardTitle>
                      <button 
                        onClick={() => handleEditInvestor(investor)}
                        className="text-slate-300 hover:text-primary transition-colors shrink-0"
                      >
                        <Settings2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">Participação: {investor.share_percentage}%</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Atual</p>
                  <p className={`text-xl sm:text-2xl font-black tabular-nums break-words ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(balance)}
                  </p>
                  <button
                    onClick={() => setStatementInvestorId(investor.id)}
                    className="mt-1 text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                  >
                    Ver extrato completo
                  </button>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                    <History className="w-3 h-3" /> Últimas Movimentações
                  </h4>
                  <div className="space-y-3">
                    {(() => {
                      const transactions = (investorTransactions || [])
                        .filter(t => t.investor_id === investor.id)
                        .map(t => ({ ...t, displayType: 'transaction' }));
                      
                      const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
                      const profitMonths = investorProfitSharesByMonth?.[investor.id] || [];
                      profitMonths.forEach(p => {
                        const [y, m] = p.month.split('-').map(Number);
                        transactions.push({
                          id: `profit-share-${investor.id}-${p.month}`,
                          description: `Dividendos ${monthNames[m - 1]}/${y}`,
                          amount: p.amount,
                          type: 'deposit',
                          date: new Date(y, m - 1, 1).toISOString(),
                          displayType: 'profit',
                          monthRef: `${String(m).padStart(2, '0')}/${y}`,
                        } as any);
                      });

                      return transactions
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 5)
                        .map(t => (
                          <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 sm:p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50 hover:bg-white hover:shadow-md transition-all group/item min-w-0">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.type === 'deposit' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                {t.type === 'deposit' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900 break-words">{t.description}</p>
                                <p className="text-[10px] font-medium text-slate-400">
                                  {t.displayType === 'profit' ? `Ref. ${(t as any).monthRef}` : new Date(t.date).toLocaleDateString("pt-BR")}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pl-11 sm:pl-0">
                              <span className={`text-sm font-black tabular-nums whitespace-nowrap ${t.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {t.type === 'deposit' ? '+' : '-'} {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(t.amount)}
                              </span>
                              {t.displayType === 'transaction' && (
                                <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover/item:opacity-100 transition-opacity">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900"
                                    onClick={() => handleEditTransaction(t)}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg hover:bg-rose-50 hover:text-rose-600"
                                    onClick={() => handleDeleteTransaction(t.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ));
                    })()}
                    {investorTransactions.filter(t => t.investor_id === investor.id).length === 0 && (
                      <p className="text-center py-6 text-sm text-slate-400 font-medium">Nenhuma movimentação registrada.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>


      {/* Transaction Modal */}
      <Dialog open={showTransactionForm} onOpenChange={setShowTransactionForm}>
        <DialogContent className="max-w-md rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-10 border-none shadow-2xl w-[calc(100vw-1.5rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
              {editingTransactionId ? "Editar Lançamento" : "Novo Lançamento"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Investidor</Label>
              <Select value={selectedInvestorId} onValueChange={setSelectedInvestorId}>
                <SelectTrigger className="h-12 sm:h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold">
                  <SelectValue placeholder="Selecione o investidor" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {investors.map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Tipo de Movimentação</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  type="button"
                  variant={type === 'deposit' ? 'default' : 'outline'}
                  className={`h-12 sm:h-14 rounded-2xl font-bold transition-all ${type === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200' : 'border-slate-100 hover:bg-slate-50'}`}
                  onClick={() => setType('deposit')}
                >
                  <TrendingUp className="w-4 h-4 mr-2" /> APORTE
                </Button>
                <Button 
                  type="button"
                  variant={type === 'withdrawal' ? 'default' : 'outline'}
                  className={`h-12 sm:h-14 rounded-2xl font-bold transition-all ${type === 'withdrawal' ? 'bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200' : 'border-slate-100 hover:bg-slate-50'}`}
                  onClick={() => setType('withdrawal')}
                >
                  <TrendingDown className="w-4 h-4 mr-2" /> RETIRADA
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Valor (R$)</Label>
              <div className="relative">
                <Input 
                  type="number" 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                  placeholder="0,00"
                  className="h-12 sm:h-14 pl-10 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white transition-all font-bold"
                />
                <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Descrição / Motivo</Label>
              <Input 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="Ex: Retirada de lucros Mensal"
                className="h-12 sm:h-14 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white transition-all font-bold"
              />
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={closeTransactionForm} className="h-12 sm:h-14 rounded-2xl font-black px-6 sm:px-8">CANCELAR</Button>
            <Button onClick={handleSaveTransaction} className="h-12 sm:h-14 rounded-2xl font-black px-8 sm:px-12 shadow-xl shadow-primary/20">
              {editingTransactionId ? "ATUALIZAR" : "CONFIRMAR"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Investor Modal */}
      <Dialog open={showInvestorForm} onOpenChange={setShowInvestorForm}>
        <DialogContent className="max-w-md rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-10 border-none shadow-2xl w-[calc(100vw-1.5rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
              {editingInvestor ? "Editar Investidor" : "Novo Investidor"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Nome do Investidor</Label>
              <Input 
                value={investorName} 
                onChange={e => setInvestorName(e.target.value)} 
                placeholder="Nome completo"
                className="h-12 sm:h-14 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white transition-all font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Participação (%)</Label>
              <Input 
                type="number" 
                value={investorShare} 
                onChange={e => setInvestorShare(e.target.value)} 
                placeholder="Ex: 40"
                max={100}
                className="h-12 sm:h-14 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white transition-all font-bold"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between w-full gap-3">
            <div>
              {editingInvestor && (
                <Button 
                  variant="ghost" 
                  onClick={() => handleDeleteInvestor(editingInvestor.id!)} 
                  className="h-12 sm:h-14 rounded-2xl font-black text-rose-500 hover:bg-rose-50"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={closeInvestorForm} className="h-12 sm:h-14 rounded-2xl font-black px-6 sm:px-8">CANCELAR</Button>
              <Button onClick={handleSaveInvestor} className="h-12 sm:h-14 rounded-2xl font-black px-8 sm:px-12 shadow-xl shadow-primary/20">
                {editingInvestor ? "ATUALIZAR" : "SALVAR"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extrato Completo */}
      <Dialog open={!!statementInvestorId} onOpenChange={(o) => !o && setStatementInvestorId(null)}>
        <DialogContent className="max-w-2xl rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-10 border-none shadow-2xl max-h-[90vh] overflow-y-auto w-[calc(100vw-1.5rem)]">
          {(() => {
            if (!statementInvestorId) return null;
            const investor = investors.find(i => i.id === statementInvestorId);
            if (!investor) return null;

            const txs = (investorTransactions || [])
              .filter(t => t.investor_id === statementInvestorId)
              .map(t => ({
                id: t.id,
                date: t.date,
                description: t.description,
                amount: Number(t.amount),
                type: t.type as 'deposit' | 'withdrawal',
                kind: t.type === 'deposit' ? 'Aporte' : 'Retirada',
              }));

            const profitMonths = investorProfitSharesByMonth?.[statementInvestorId] || [];
            const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

            // Validações
            const totalShare = investors.reduce((acc, i) => acc + (i.share_percentage || 0), 0);
            const shareWarning = totalShare > 100
              ? `⚠️ Soma das participações = ${totalShare}% (excede 100%).`
              : totalShare < 100 && totalShare > 0
                ? `ℹ️ Soma das participações = ${totalShare}% (${100 - totalShare}% retido na empresa).`
                : null;

            const profitRows = profitMonths.map(p => {
              const [y, m] = p.month.split('-').map(Number);
              const ref = `${String(m).padStart(2, '0')}/${y}`;
              const expected = Number((p.netProfit * (investor.share_percentage / 100)).toFixed(2));
              const mismatch = Math.abs(expected - p.amount) > 0.01;
              return {
                id: `profit-${p.month}`,
                date: new Date(y, m - 1, 1).toISOString(),
                description: `Lucro ${monthNames[m - 1]}/${y} (Ref: ${ref}) — ${investor.share_percentage}% sobre EBITDA de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.netProfit)}${mismatch ? ' ⚠️ divergência detectada' : ''}`,
                amount: expected,
                type: 'deposit' as const,
                kind: `Lucro ${ref}`,
              };
            });

            // Validação: confirma que cada mês com lucro na DRE gerou linha no extrato
            const expectedMonths = profitMonths.length;
            const generatedRows = profitRows.length;
            const profitValidation = expectedMonths === generatedRows
              ? `✓ ${generatedRows} ${generatedRows === 1 ? 'mês com lucro distribuído' : 'meses com lucro distribuídos'} automaticamente (${investor.share_percentage}%).`
              : `⚠️ DRE indica ${expectedMonths} ${expectedMonths === 1 ? 'mês' : 'meses'} com lucro, mas ${generatedRows} ${generatedRows === 1 ? 'linha foi gerada' : 'linhas foram geradas'}.`;

            const rows = [...txs, ...profitRows].sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            );

            let running = 0;
            const withBalance = rows.map(r => {
              running += r.type === 'deposit' ? r.amount : -r.amount;
              return { ...r, balance: running };
            }).reverse();

            const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
                    Extrato — {investor.name}
                  </DialogTitle>
                  <p className="text-sm text-slate-400 font-medium">
                    Saldo final: <span className={running >= 0 ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'}>{fmt(running)}</span>
                  </p>
                </DialogHeader>

                {shareWarning && (
                  <div className={`text-xs font-bold p-3 rounded-xl ${totalShare > 100 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                    {shareWarning}
                  </div>
                )}

                <div className={`text-xs font-bold p-3 rounded-xl ${expectedMonths === generatedRows ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                  {profitValidation}
                </div>


                <div className="space-y-2 py-4">
                  {withBalance.length === 0 && (
                    <p className="text-center py-8 text-sm text-slate-400 font-medium">Nenhuma movimentação.</p>
                  )}
                  {withBalance.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${r.type === 'deposit' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                          {r.type === 'deposit' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{r.description}</p>
                          <p className="text-[10px] font-medium text-slate-400">
                            {new Date(r.date).toLocaleDateString('pt-BR')} • {r.kind}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className={`text-sm font-black tabular-nums ${r.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {r.type === 'deposit' ? '+' : '-'} {fmt(r.amount)}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 tabular-nums">Saldo: {fmt(r.balance)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <DialogFooter>
                  <Button onClick={() => setStatementInvestorId(null)} className="h-12 rounded-2xl font-black px-8">FECHAR</Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};
