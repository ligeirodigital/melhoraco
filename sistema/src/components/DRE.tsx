import React, { useState, useMemo } from "react";
import { useDreMetrics, useProjectData } from "@/hooks/useProjectData";
import { useFinance } from "@/hooks/useFinance";
import { motion, AnimatePresence } from "framer-motion";
import { getQuoteTotal } from "@/lib/formatQuote";
import { useFinanceData } from "@/hooks/useFinanceData";
import { Skeleton } from "@/components/ui/skeleton";
import { FileSpreadsheet, Plus, Trash2, ArrowUpRight, ArrowDownRight, Scale, Pencil, X, CheckCircle2, FileDown, Filter, Calendar, Coins, PiggyBank, TrendingUp, TrendingDown, Info, AlertCircle, BarChart3, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { renderPdfBlob } from "@/lib/pdfLoader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// react-pdf (~1.46MB) entra na rede apenas via renderPdfBlob, sob demanda.
const loadDREReportPdf = async (props: any) => {
  const { DREReport } = await import('./financial/DREReport');
  return renderPdfBlob(<DREReport {...props} />);
};
const loadCashFlowReportPdf = async (props: any) => {
  const { CashFlowReport } = await import('./financial/CashFlowReport');
  return renderPdfBlob(<CashFlowReport {...props} />);
};
import { CashFlowTable } from "./financial/sections/CashFlowTable";
import { DRECharts } from "./financial/sections/DRECharts";
import { DRETable } from "./financial/sections/DRETable";
import { CogsAudit } from "./financial/sections/CogsAudit";
import { CategoryManager } from "./financial/CategoryManager";
import { InvestorModule } from "./financial/InvestorModule";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
const FinancialAssistant = React.lazy(() => import("./financial/FinancialAssistant"));

export const DRE = () => {
  const { user } = useAuth();
  const { quotes, inventory, mutations: projectMutations } = useProjectData();
  const [period, setPeriod] = useState("month");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date, end: Date;
    switch (period) {
      case "last_month": const lastMonth = subMonths(now, 1); start = startOfMonth(lastMonth); end = endOfMonth(lastMonth); break;
      case "last_3_months": start = startOfMonth(subMonths(now, 2)); end = endOfMonth(now); break;
      case "year": start = startOfYear(now); end = endOfMonth(now); break;
      case "all": start = new Date(2000, 0, 1); end = new Date(2100, 11, 31); break;
      case "custom": start = new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0); end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999); break;
      case "month": default: start = startOfMonth(now); end = endOfMonth(now); break;
    }
    return { start, end };
  }, [period, selectedYear, selectedMonth]);
  const { transactions, categories, dreData, prevMonthDre, isLoading: financeLoading, mutations, investors } = useFinance(dateRange.start, dateRange.end);
  const [activeTab, setActiveTab] = useState("cashflow");
  const [showCashFlowForm, setShowCashFlowForm] = useState(false);
  const [editingCfId, setEditingCfId] = useState<string | null>(null);
  const [cfDescription, setCfDescription] = useState("");
  const [cfAmount, setCfAmount] = useState("");
  const [cfType, setCfType] = useState<"income" | "expense" | "investment">("expense");
  const [cfCategory, setCfCategory] = useState("");
  const [cfPaymentMethodInput, setCfPaymentMethodInput] = useState("");
  const [cfStatus, setCfStatus] = useState<"pago" | "pendente">("pago");
  const [cfTransactionDate, setCfTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [cfQuoteId, setCfQuoteId] = useState<string | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: string, name: string, isAutomatic?: boolean } | null>(null);
  const [cfSearchTerm, setCfSearchTerm] = useState("");
  const [cfPaymentMethod, setCfPaymentMethod] = useState("all");
  const [cfStartDate, setCfStartDate] = useState("");
  const [cfEndDate, setCfEndDate] = useState("");
  const formatCurrency = (val?: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);

  const filteredCashFlow = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(t => {
      const d = new Date(t.transaction_date);
      if (d < dateRange.start || d > dateRange.end) return false;
      if (cfSearchTerm && !t.description.toLowerCase().includes(cfSearchTerm.toLowerCase()) && !t.category.toLowerCase().includes(cfSearchTerm.toLowerCase())) return false;
      if (cfPaymentMethod !== "all" && (t as any).payment_method !== cfPaymentMethod) return false;
      if (cfStartDate && d < new Date(cfStartDate)) return false;
      if (cfEndDate && d > new Date(cfEndDate)) return false;
      return true;
    });
  }, [transactions, dateRange, cfSearchTerm, cfPaymentMethod, cfStartDate, cfEndDate]);

  const handleExportPDF = async () => {
    if (!dreData) return;
    const periodLabel = period === "month" ? "Mês Atual" : `${format(dateRange.start, "dd_MM_yy")}_a_${format(dateRange.end, "dd_MM_yy")}`;
    const blob = await loadDREReportPdf({ data: dreData, prevData: prevMonthDre, periodLabel, investors });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DRE_${periodLabel}.pdf`;
    link.click();
  };

  const handleExportCashFlowPDF = async () => {
    if (!filteredCashFlow.length) return toast.error("Não há lançamentos para exportar");
    const periodLabel = period === "month" ? "Mês Atual" : `${format(dateRange.start, "dd_MM_yy")}_a_${format(dateRange.end, "dd_MM_yy")}`;
    const blob = await loadCashFlowReportPdf({ transactions: filteredCashFlow, periodLabel });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Fluxo_Caixa_${periodLabel}.pdf`;
    link.click();
  };

  const handleSaveCashFlow = async () => {
    if (!user || !cfDescription || !cfAmount || !cfCategory) return toast.error("Preencha todos os campos");
    try {
      const [year, month, day] = cfTransactionDate.split('-').map(Number);
      const transactionDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString();
      await mutations.addCashFlow.mutateAsync({ user_id: user.id, description: cfDescription, amount: Number(cfAmount), type: cfType === "investment" ? "income" : cfType, category: cfCategory, transaction_date: transactionDate, status: cfStatus, payment_method: cfPaymentMethodInput || null, quote_id: cfQuoteId || null, id: editingCfId || undefined });
      setShowCashFlowForm(false);
      setEditingCfId(null);
      toast.success("Salvo com sucesso!");
    } catch (e: any) { toast.error(e?.message || "Erro ao salvar."); }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
        if (deleteConfirm.type === 'cf') await mutations.removeCashFlow.mutateAsync(deleteConfirm.id);
        toast.success("Lançamento removido");
        setDeleteConfirm(null);
    } catch (e) { toast.error("Erro ao deletar."); }
  };

  const handleEditCashFlow = (t: any) => {
    setEditingCfId(t.id); setCfDescription(t.description); setCfAmount(String(t.amount)); setCfType(t.type); setCfCategory(t.category); setShowCashFlowForm(true);
  };

  return (
    <div className="p-4 sm:p-6 md:p-12 space-y-8 sm:space-y-12 animate-in fade-in duration-700 max-w-[1600px] mx-auto bg-[#FBFBFB] min-h-screen w-full min-w-0">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-8 pb-6 sm:pb-8 border-b border-slate-200/60">
        <div className="space-y-3 sm:space-y-4 min-w-0">
          <h1 className="font-black tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 break-words" style={{ fontSize: "clamp(1.75rem, 6vw, 3rem)" }}>Fluxo de <span className="text-primary">Caixa</span></h1>
          <p className="text-slate-500 text-base sm:text-lg font-medium">Gestão inteligente do seu financeiro.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center w-full lg:w-auto">
          <div className="flex flex-wrap gap-3 sm:gap-4 items-center bg-white/80 backdrop-blur-md p-1.5 rounded-3xl sm:rounded-[2rem] border border-slate-200/80 shadow-sm px-4 sm:px-6 min-w-0">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            
            <div className="flex items-center gap-2 min-w-0">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[140px] border-none bg-transparent font-bold focus:ring-0 h-auto p-0 text-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="month">Mês Atual</SelectItem>
                  <SelectItem value="last_month">Mês Anterior</SelectItem>
                  <SelectItem value="last_3_months">Últimos 3 Meses</SelectItem>
                  <SelectItem value="year">Este Ano</SelectItem>
                  <SelectItem value="all">Todo Período</SelectItem>
                  <SelectItem value="custom">Mês/Ano Específico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {period === "custom" && (
              <div className="flex items-center gap-2 border-l border-slate-200 pl-3 sm:pl-4 sm:ml-2 animate-in slide-in-from-left-2 duration-300">
                <Select 
                  value={selectedMonth.toString()} 
                  onValueChange={(v) => setSelectedMonth(parseInt(v))}
                >
                  <SelectTrigger className="w-[110px] border-none bg-transparent font-bold focus:ring-0 h-auto p-0 text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {format(new Date(2024, i, 1), "MMMM", { locale: ptBR })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select 
                  value={selectedYear.toString()} 
                  onValueChange={(v) => setSelectedYear(parseInt(v))}
                >
                  <SelectTrigger className="w-[80px] border-none bg-transparent font-bold focus:ring-0 h-auto p-0 text-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {Array.from({ length: 5 }).map((_, i) => {
                      const year = new Date().getFullYear() - i;
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex gap-3 sm:gap-4">
            <Button onClick={handleExportPDF} variant="outline" className="flex-1 sm:flex-none h-12 rounded-3xl sm:rounded-[2rem] border-slate-200 bg-white font-bold px-4 sm:px-6 gap-2"><FileDown className="w-4 h-4" /> PDF</Button>
            <Button onClick={() => setShowCategoryManager(true)} variant="outline" className="flex-1 sm:flex-none h-12 rounded-3xl sm:rounded-[2rem] border-slate-200 bg-white font-bold px-4 sm:px-6 gap-2"><Settings2 className="w-4 h-4" /> REGRAS</Button>
          </div>
        </div>
      </header>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="-mx-4 sm:mx-0 overflow-x-auto no-scrollbar mb-8 sm:mb-12 px-4 sm:px-0">
          <TabsList className="bg-slate-100/50 backdrop-blur-sm p-1.5 rounded-[2rem] border border-slate-200/50 grid grid-cols-2 sm:inline-flex h-auto w-full sm:w-auto shadow-inner">
            <TabsTrigger value="cashflow" className="rounded-[1.6rem] px-4 sm:px-8 py-2.5 font-bold text-[11px] sm:text-xs uppercase data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap">Fluxo de Caixa</TabsTrigger>
            <TabsTrigger value="dre" className="rounded-[1.6rem] px-4 sm:px-8 py-2.5 font-bold text-[11px] sm:text-xs uppercase data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap">DRE</TabsTrigger>
            <TabsTrigger value="investors" className="rounded-[1.6rem] px-4 sm:px-8 py-2.5 font-bold text-[11px] sm:text-xs uppercase data-[state=active]:bg-white data-[state=active]:shadow-sm whitespace-nowrap">Investidores</TabsTrigger>
            <TabsTrigger value="assistant" className="rounded-[1.6rem] px-4 sm:px-8 py-2.5 font-bold text-[11px] sm:text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm whitespace-nowrap">Assistente IA</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="dre" className="space-y-8 sm:space-y-12 outline-none">
          <DRECharts dreData={dreData} prevMonthDre={prevMonthDre} formatCurrency={formatCurrency} />
          <DRETable dreData={dreData} prevMonthDre={prevMonthDre} formatCurrency={formatCurrency} investors={investors} />
        </TabsContent>
        <TabsContent value="cashflow" className="space-y-6 sm:space-y-10 outline-none">
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl sm:rounded-[3.5rem] border border-slate-200/60 shadow-xl overflow-hidden p-4 sm:p-10 md:p-14">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Lançamentos</h2>
              <div className="flex gap-3 w-full sm:w-auto">
                <Button onClick={handleExportCashFlowPDF} variant="outline" className="flex-1 sm:flex-none h-12 sm:h-14 rounded-2xl font-black px-4 sm:px-8 border-slate-200 gap-2">
                  <FileDown className="w-4 h-4" /> EXPORTAR
                </Button>
                <Button onClick={() => setShowCashFlowForm(true)} className="flex-1 sm:flex-none h-12 sm:h-14 rounded-2xl font-black px-4 sm:px-8"><Plus className="mr-2 sm:mr-3 w-4 h-4" /> NOVO</Button>
              </div>
            </div>
            <CashFlowTable transactions={filteredCashFlow} formatCurrency={formatCurrency} onEdit={handleEditCashFlow} onDelete={(id, name) => setDeleteConfirm({ id, type: 'cf', name })} />
          </motion.div>
        </TabsContent>
        <TabsContent value="investors" className="space-y-6 sm:space-y-10 outline-none">
          <InvestorModule />
        </TabsContent>
        <TabsContent value="assistant" className="outline-none">
          <React.Suspense fallback={<p role="status" className="text-muted-foreground">Carregando assistente…</p>}>
            <FinancialAssistant />
          </React.Suspense>
        </TabsContent>
      </Tabs>


      <Dialog open={showCashFlowForm} onOpenChange={setShowCashFlowForm}>
        <DialogContent className="max-w-2xl rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-10 border-none shadow-2xl max-h-[90vh] overflow-y-auto w-[calc(100vw-1.5rem)]">
          <DialogHeader>
            <DialogTitle className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {editingCfId ? "Editar Lançamento" : "Novo Lançamento"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 py-4 sm:py-6">
            <div className="col-span-2 space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Descrição</Label>
              <Input 
                value={cfDescription} 
                onChange={e => setCfDescription(e.target.value)}
                placeholder="Ex: Pagamento Fornecedor A"
                className="h-12 sm:h-14 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white transition-all font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Valor (R$)</Label>
              <Input 
                type="number"
                value={cfAmount} 
                onChange={e => setCfAmount(e.target.value)}
                placeholder="0,00"
                className="h-12 sm:h-14 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white transition-all font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Tipo</Label>
              <Select value={cfType} onValueChange={(v: any) => setCfType(v)}>
                <SelectTrigger className="h-12 sm:h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="income">Entrada</SelectItem>
                  <SelectItem value="expense">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Categoria</Label>
              <Select value={cfCategory} onValueChange={setCfCategory}>
                <SelectTrigger className="h-12 sm:h-14 rounded-2xl border-slate-100 bg-slate-50 font-bold">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Data</Label>
              <Input 
                type="date"
                value={cfTransactionDate} 
                onChange={e => setCfTransactionDate(e.target.value)}
                className="h-12 sm:h-14 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white transition-all font-bold"
              />
            </div>
          </div>

          <DialogFooter className="gap-3 mt-4">
            <Button variant="ghost" onClick={() => setShowCashFlowForm(false)} className="h-12 sm:h-14 rounded-2xl font-black px-6 sm:px-8">CANCELAR</Button>
            <Button onClick={handleSaveCashFlow} className="h-12 sm:h-14 rounded-2xl font-black px-8 sm:px-12 shadow-xl shadow-primary/20">SALVAR</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent className="rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-10 border-none shadow-2xl w-[calc(100vw-1.5rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-slate-900">Confirmar Exclusão?</AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-slate-500">
              Deseja realmente remover o lançamento "{deleteConfirm?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
            <AlertDialogCancel className="h-12 sm:h-14 rounded-2xl font-black border-none bg-slate-50">CANCELAR</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="h-12 sm:h-14 rounded-2xl font-black bg-rose-500 hover:bg-rose-600 shadow-xl shadow-rose-200">EXCLUIR</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CategoryManager 
        open={showCategoryManager} 
        onOpenChange={setShowCategoryManager}
        categories={categories}
        onAdd={(cat) => mutations.addCategory.mutateAsync(cat)}
        onRemove={(id) => mutations.removeCategory.mutateAsync(id)}
        userId={user?.id || ""}
      />
    </div>
  );
};
