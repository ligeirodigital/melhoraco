import { useState, useMemo } from "react";
import { appUrl } from "@/lib/appUrl";
import { leadOriginLabel } from "@/lib/attribution";
import { FollowUpQueue } from "@/components/sales/FollowUpQueue";
import { followUpQueue } from "@/lib/salesFollowUp";
import { 
  Search, Plus, UserCircle, Trash2, Calendar, FileText, 
  ArrowRight, CreditCard, Copy, Filter, X,
  ChevronRight, ArrowUpRight, Package, Clock, CheckCircle2, Truck, MoreHorizontal
} from "lucide-react";
import { useProjectData } from "@/hooks/useProjectData";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, getQuoteTotal, formatWhatsApp } from "@/lib/formatQuote";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MainLayout } from "@/components/MainLayout";
import { supabase } from "@/lib/cloudStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { confirmAction } from "@/lib/confirmAction";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1]
    }
  }
};

export default function QuotesList() {
  const navigate = useNavigate();
  const { quotes, mutations, settings, pipelineStages } = useProjectData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    let result = (quotes.data ?? []).filter(q => 
      q.client?.name?.toLowerCase().includes(search.toLowerCase())
    );

    if (statusFilter !== "all") {
      result = statusFilter === "follow_up" ? followUpQueue(result) : result.filter(q => q.status === statusFilter);
    }

    if (paymentFilter !== "all") {
      result = result.filter(q => {
        if (paymentFilter === "paid") return q.payment_status === "paid";
        if (paymentFilter === "pending") return q.payment_status !== "paid";
        return true;
      });
    }

    return result;
  }, [quotes.data, search, statusFilter, paymentFilter]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (await confirmAction({ title: "Excluir este orçamento?", description: "Os pagamentos registrados nele também são apagados.", confirmLabel: "Excluir", destructive: true })) {
      const promise = mutations.removeQuote.mutateAsync(id);
      toast.promise(promise, {
        loading: 'Removendo orçamento...',
        success: 'Orçamento removido com sucesso!',
        error: 'Erro ao remover orçamento.'
      });
    }
  };

  const PRODUCTION_STAGES = [
    { id: "pendente", label: "Pendente", color: "amber", icon: Clock },
    { id: "em_producao", label: "Em Produção", color: "blue", icon: Package },
    { id: "finalizado", label: "Finalizado", color: "emerald", icon: CheckCircle2 },
    { id: "entregue", label: "Entregue", color: "slate", icon: Truck },
  ];

  const handleUpdateStage = async (e: React.MouseEvent, quoteId: string, stage: string) => {
    e.stopPropagation();
    try {
      const { error } = await supabase.from("quotes").update({ stage } as any).eq("id", quoteId);
      if (error) throw error;
      quotes.refetch();
      const stageLabel = PRODUCTION_STAGES.find(s => s.id === stage)?.label || stage;
      toast.success(`Produção: ${stageLabel}`);
    } catch (err: any) {
      toast.error("Erro ao atualizar status: " + err.message);
    }
  };



  return (
    <MainLayout>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-[1400px] mx-auto space-y-8 md:space-y-12 pb-24 overflow-x-hidden"
      >
        {/* Header Section */}
        <motion.header variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 min-w-0">
          <div className="space-y-3 sm:space-y-4 min-w-0">
            <span className="label-caps !mb-1 opacity-60">Gestão Comercial</span>
            <h1 className="font-black tracking-tight text-slate-900 leading-none" style={{ fontSize: 'clamp(2rem, 7vw, 3.75rem)' }}>
              Orçamentos
            </h1>
            <p className="text-slate-400 font-bold max-w-md text-sm sm:text-base">
              Acompanhe suas propostas, controle recebimentos e gerencie clientes em um só lugar.
            </p>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 w-full md:w-auto">
            <Button 
              onClick={() => navigate("/new")} 
              className="h-12 sm:h-16 rounded-2xl sm:rounded-3xl font-black px-6 sm:px-10 bg-slate-900 text-white shadow-2xl hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 group w-full md:w-auto"
            >
              <Plus className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 group-hover:rotate-180 transition-transform duration-500" />
              NOVO PEDIDO
            </Button>
          </div>
        </motion.header>

        {/* Search & Filters Section */}
        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row gap-4 md:gap-6 items-stretch lg:items-center min-w-0">
          <div className="relative group flex-1 min-w-0">
            <div className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">
              <Search className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <Input 
              placeholder="Pesquisar por cliente..." 
              className="pl-14 sm:pl-16 h-14 sm:h-16 rounded-2xl sm:rounded-[2rem] border-slate-100 bg-white shadow-sm text-base sm:text-lg font-bold transition-all focus:ring-4 focus:ring-primary/5 focus:border-primary/20"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4">
             <Button variant={statusFilter === "follow_up" ? "default" : "outline"} className="h-14 shrink-0" onClick={() => { setStatusFilter(statusFilter === "follow_up" ? "all" : "follow_up"); setPaymentFilter("all"); }}><Clock className="size-4" />A cobrar</Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-14 sm:h-16 px-6 sm:px-10 rounded-2xl sm:rounded-[2rem] gap-3 sm:gap-4 font-black bg-white premium-border shadow-sm group w-full lg:w-auto">
                  <Filter className="w-5 h-5 sm:w-6 sm:h-6 text-primary group-hover:scale-110 transition-transform" />
                  FILTROS
                  <AnimatePresence>
                    {(statusFilter !== "all" || paymentFilter !== "all") && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <Badge className="bg-primary text-white border-none h-6 min-w-6 flex items-center justify-center rounded-full p-0">
                          { (statusFilter !== "all" ? 1 : 0) + (paymentFilter !== "all" ? 1 : 0) }
                        </Badge>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-8 rounded-[2.5rem] shadow-2xl border-slate-100 mt-2" align="end">
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-xl tracking-tight">Filtros Avançados</h4>
                    {(statusFilter !== "all" || paymentFilter !== "all") && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          setStatusFilter("all");
                          setPaymentFilter("all");
                        }}
                        className="h-10 px-4 rounded-xl text-xs font-black text-slate-400 hover:text-red-500 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-2" /> LIMPAR
                      </Button>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="label-caps !mb-0 opacity-50">Status da Proposta</label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 font-black">
                          <SelectValue placeholder="Todos os status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                          <SelectItem value="all">Todos os status</SelectItem>
                           <SelectItem value="follow_up">A cobrar</SelectItem>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="aprovado">Aprovado</SelectItem>
                          <SelectItem value="recusado">Recusado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <label className="label-caps !mb-0 opacity-50">Fluxo de Pagamento</label>
                      <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                        <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 font-black">
                          <SelectValue placeholder="Todos os pagamentos" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                          <SelectItem value="all">Todos os pagamentos</SelectItem>
                          <SelectItem value="pending">Pagamento Pendente</SelectItem>
                          <SelectItem value="paid">Pagamento Recebido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </motion.div>

        {/* List Section */}
        {statusFilter === "follow_up" ? <FollowUpQueue quotes={filtered} stages={pipelineStages.data || []} loading={quotes.isLoading} /> : <div className="grid gap-6">
          {quotes.isLoading ? (
            <QuotesSkeleton />
          ) : (
            <AnimatePresence mode="popLayout">
              {filtered.map(q => {
                const total = getQuoteTotal(q);
                return (
                  <motion.div 
                    layout
                    key={q.id} 
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => navigate(`/quotes/${q.id}`)}
                    className="group glass-card p-1 rounded-[2rem] sm:rounded-[2.5rem] transition-all relative min-w-0"
                  >
                    <div className="p-5 sm:p-7 md:p-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6 md:gap-8 cursor-pointer group-hover:bg-slate-50/50 rounded-[1.8rem] sm:rounded-[2.4rem] transition-all min-w-0">
                      <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                        <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white premium-border rounded-2xl sm:rounded-[1.8rem] flex items-center justify-center text-slate-300 group-hover:text-primary transition-all shadow-sm shrink-0">
                          <UserCircle className="w-9 h-9 sm:w-12 sm:h-12" />
                        </div>
                        <div className="space-y-2 min-w-0 flex-1">
                          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <h3 className="font-black text-slate-900 tracking-tight group-hover:text-primary transition-colors break-words" style={{ fontSize: 'clamp(1.125rem, 4vw, 1.5rem)' }}>
                              {q.client.name}
                            </h3>
                            <span className="text-xs text-muted-foreground break-words">Origem: {leadOriginLabel(q)}</span>
                            <div className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0",
                              q.status === "aprovado" ? "bg-emerald-100 text-emerald-600" : 
                              q.status === "recusado" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                            )}>
                              {q.status}
                            </div>
                            {q.status === "aprovado" && (() => {
                              const currentStage = PRODUCTION_STAGES.find(s => s.id === ((q as any).stage || "pendente")) || PRODUCTION_STAGES[0];
                              const StageIcon = currentStage.icon;
                              return (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <button className={cn(
                                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors",
                                      currentStage.color === "amber" && "bg-amber-100 text-amber-700 hover:bg-amber-200",
                                      currentStage.color === "blue" && "bg-blue-100 text-blue-700 hover:bg-blue-200",
                                      currentStage.color === "emerald" && "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
                                      currentStage.color === "slate" && "bg-slate-100 text-slate-700 hover:bg-slate-200",
                                    )}>
                                      <StageIcon className="w-3 h-3" />
                                      {currentStage.label}
                                      <MoreHorizontal className="w-3 h-3 opacity-60" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="rounded-xl p-2 w-48" onClick={(e) => e.stopPropagation()}>
                                    {PRODUCTION_STAGES.map(s => {
                                      const SIcon = s.icon;
                                      return (
                                        <DropdownMenuItem
                                          key={s.id}
                                          onClick={(e) => handleUpdateStage(e as any, q.id, s.id)}
                                          className={cn(
                                            "rounded-lg p-2.5 font-bold flex items-center gap-3 cursor-pointer text-xs",
                                            ((q as any).stage || "pendente") === s.id && "bg-slate-50"
                                          )}
                                        >
                                          <SIcon className={cn(
                                            "w-4 h-4",
                                            s.color === "amber" && "text-amber-500",
                                            s.color === "blue" && "text-blue-500",
                                            s.color === "emerald" && "text-emerald-500",
                                            s.color === "slate" && "text-slate-500",
                                          )} />
                                          {s.label}
                                        </DropdownMenuItem>
                                      );
                                    })}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              );
                            })()}
                          </div>
                          <div className="flex flex-wrap items-center gap-4">
                            <span className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                              <Calendar className="w-4 h-4 text-slate-300" /> 
                              {new Date(q.created_at).toLocaleDateString('pt-BR')}
                            </span>
                            <span className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                            <span className="text-[11px] font-black text-primary/70 uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-full">
                              {q.items.length} ITENS
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between xl:justify-end gap-6 sm:gap-8 md:gap-10 min-w-0">
                        <div className="text-left sm:text-right w-full sm:w-auto min-w-0">
                          <span className="label-caps !mb-1 opacity-50">Total da Proposta</span>
                          <p className="font-black text-slate-900 tracking-tighter break-words" style={{ fontSize: 'clamp(1.5rem, 5vw, 1.875rem)' }}>
                            {formatCurrency(total)}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="flex items-center gap-2">
                            <motion.button 
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              aria-label="Copiar para WhatsApp"
                              className="min-h-11 min-w-11 h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white premium-border flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/5 transition-all" 
                              onClick={(e) => {
                                e.stopPropagation();
                                const portalUrl = q.order_token 
                                  ? `${appUrl()}/p/${q.order_token}`
                                  : `${appUrl()}/p/q_${q.id}_${q.client_view_token}`;
                                
                                const text = formatWhatsApp(q, settings.data?.nubank_pix_key, settings.data?.nubank_pix_name, portalUrl);
                                navigator.clipboard.writeText(text);
                                toast.success("Orçamento copiado para WhatsApp!");
                                mutations.markFollowUp.mutate(q.id);
                              }}
                            >
                              <Copy className="w-5 h-5 sm:w-6 sm:h-6" />
                            </motion.button>

                            <motion.button 
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              aria-label="Excluir orçamento"
                              className="min-h-11 min-w-11 h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white premium-border flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all" 
                              onClick={(e) => handleDelete(e, q.id)}
                            >
                              <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                            </motion.button>
                          </div>

                          <div className="min-h-11 min-w-11 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-slate-900 flex items-center justify-center text-white shadow-xl group-hover:shadow-2xl group-hover:scale-105 transition-all shrink-0">
                            <ArrowUpRight className="w-6 h-6 sm:w-7 sm:h-7 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
          
          {!quotes.isLoading && filtered.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-32 glass-card rounded-[3rem] flex flex-col items-center gap-8 border-dashed border-2 border-slate-100"
            >
              <div className="w-28 h-28 bg-slate-50 rounded-full flex items-center justify-center shadow-inner">
                <FileText className="w-12 h-12 text-slate-200" />
              </div>
              <div className="space-y-2">
                <p className="text-slate-900 font-black text-2xl tracking-tight">Nenhuma proposta encontrada</p>
                <p className="text-slate-400 font-bold max-w-sm mx-auto">Tente ajustar seus filtros ou inicie um novo orçamento agora mesmo.</p>
              </div>
              <Button 
                onClick={() => navigate("/new")} 
                className="rounded-2xl font-black h-16 px-10 bg-slate-900 text-white shadow-xl hover:shadow-2xl transition-all"
              >
                CRIAR NOVO PEDIDO
              </Button>
            </motion.div>
          )}
        </div>}
      </motion.div>
    </MainLayout>
  );
}

const QuotesSkeleton = () => (
  <div className="grid gap-6">
    {[1, 2, 3].map(i => (
      <Skeleton key={i} className="h-40 rounded-[2.5rem] opacity-50" />
    ))}
  </div>
);
