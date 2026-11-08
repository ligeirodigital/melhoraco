import React, { useMemo, useState, useEffect } from "react";
import { leadOriginLabel } from "@/lib/attribution";
import { supabase, FN_PREFIX } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { POLL, queryKeys } from "@/lib/queryKeys";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MainLayout } from "@/components/MainLayout";
import { useProjectData } from "@/hooks/useProjectData";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Share2, Copy, FileText, Loader2, RefreshCw, 
  ClipboardList, Tag, Pencil, CreditCard, MapPin, 
  DollarSign, CheckCircle2, XCircle, Printer, ExternalLink,
  ChevronRight, Calendar as CalendarIcon, User, Phone, Package,
  Zap, Check, ReceiptText
} from "lucide-react";
import { formatCurrency, getQuoteTotal, formatWhatsApp } from "@/lib/formatQuote";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LazyPdfButton } from "@/components/LazyPdfButton";
import { ContractSection } from "@/components/ContractSection";
import { InstallationSection } from "@/components/InstallationSection";
import logo from "@/assets/logo.jfif";
import { FullQuote } from "@/lib/cloudStore";
import { createPaymentLink } from "@/lib/payments";
import { useAuth } from "@/hooks/useAuth";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";
import { format } from "date-fns";
import { getBoletoPlan } from "@/lib/receivables";

const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1]
    }
  }
};

const QuoteViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { quotes, mutations, settings } = useProjectData();
  const [dateModal, setDateModal] = useState<{
    open: boolean;
    type: "full" | "down_payment_paid_at" | "final_payment_paid_at" | null;
    date: Date;
    isRemoving: boolean;
  }>({ open: false, type: null, date: new Date(), isRemoving: false });
  const [addressCopied, setAddressCopied] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [lastCheck, setLastCheck] = useState<{ at: Date; result: "paid" | "pending" | "error"; message?: string; source?: string } | null>(null);
  const [creatingLink, setCreatingLink] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleCreateInfinityPayLink = async () => {
    if (!id || !user || !quote) return;
    setCreatingLink(true);
    try {
      const total = getQuoteTotal(quote);
      const tx = await createPaymentLink({
        quoteId: id,
        userId: user.id,
        amount: total,
        provider: "infinitypay",
        clientName: quote.client?.name || "Cliente",
      });
      await reloadTx();
      if ((tx as any)?.payment_link) window.open((tx as any).payment_link, "_blank");
      toast.success((tx as any)?.sandbox ? "Link sandbox gerado!" : "Link InfinityPay gerado!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar link");
    } finally {
      setCreatingLink(false);
    }
  };

  const paymentTxQuery = useQuery({
    queryKey: queryKeys.quotePaymentTx(id ?? ""),
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase
        .from("payment_transactions")
        .select("*")
        .eq("quote_id", id!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
  });
  const paymentTx = paymentTxQuery.data as any;

  const reloadTx = async () => {
    const { data } = await paymentTxQuery.refetch();
    return data ?? null;
  };

  const handleCheckPayment = async (manual = false, silent = false) => {
    if (!id || checkingPayment) return;
    let receiptUrl: string | null = null;
    if (manual) {
      receiptUrl = window.prompt("Cole o link do comprovante (opcional):") || null;
      if (!window.confirm("Confirmar recebimento manualmente? Isso marca o orçamento como PAGO.")) return;
    }
    setCheckingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke(`${FN_PREFIX}infinitypay-check-payment`, {
        body: { quoteId: id, manual, receiptUrl },
      });
      if (error) throw error;
      await reloadTx();
      quotes.refetch?.();
      const result = data?.status === "paid" ? "paid" : "pending";
      setLastCheck({ at: new Date(), result, source: data?.source });
      if (!silent) {
        if (result === "paid") toast.success(manual ? "Pagamento confirmado manualmente!" : "Pagamento confirmado!");
        else toast.info("Ainda pendente. Se o cliente já pagou, use 'Confirmar manualmente'.");
      }
    } catch (e: any) {
      setLastCheck({ at: new Date(), result: "error", message: e.message });
      if (!silent) toast.error("Erro ao verificar: " + e.message);
    } finally {
      setCheckingPayment(false);
    }
  };


  // Auto-verificação enquanto o pagamento InfinityPay está pendente.
  // A confirmação continua sendo feita no backend (payment_check + webhook +
  // payment_events); o frontend apenas consulta e reflete o estado.
  const pendingInfinityPay =
    !!id && paymentTx?.provider === "infinitypay" && paymentTx?.status !== "paid";

  useQuery({
    queryKey: ["payment-check", id, paymentTx?.id],
    enabled: pendingInfinityPay,
    queryFn: async () => {
      await handleCheckPayment(false, true);
      return Date.now();
    },
    // Para de verificar assim que o pagamento deixa de estar pendente.
    refetchInterval: pendingInfinityPay ? POLL.payment : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    staleTime: POLL.payment,
    gcTime: 0,
    // Evita uma verificação extra logo na montagem: a primeira só ocorre
    // após o intervalo, igual ao comportamento anterior.
    initialData: () => Date.now(),
    initialDataUpdatedAt: () => Date.now(),
  });

  const quote = useMemo(() =>

    quotes.data?.find(q => q.id === id) as FullQuote | undefined,
    [quotes.data, id]
  );

  const boletoPlan = getBoletoPlan(quote?.payment_method_type);
  const receivablesQuery = useQuery({
    queryKey: queryKeys.quoteReceivables(id ?? ""),
    enabled: !!id && !!boletoPlan,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_flow_transactions")
        .select("*")
        .eq("quote_id", id ?? "")
        .eq("type", "income")
        .not("installment_number", "is", null)
        .order("installment_number", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const provisionReceivables = async () => {
    if (!id) return;
    const { error } = await supabase.rpc("provision_quote_receivables", {
      p_quote_id: id,
      p_base_date: new Date().toISOString().slice(0, 10),
    });
    if (error) throw error;
    await Promise.all([
      receivablesQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] }),
      queryClient.invalidateQueries({ queryKey: ["receivables"] }),
    ]);
  };

  const setReceivableStatus = async (receivableId: string, paid: boolean) => {
    const { error } = await supabase.rpc("set_quote_receivable_status", {
      p_receivable_id: receivableId,
      p_status: paid ? "pago" : "pendente",
      p_paid_at: new Date().toISOString(),
    });
    if (error) throw error;
    await Promise.all([
      receivablesQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] }),
      queryClient.invalidateQueries({ queryKey: ["receivables"] }),
    ]);
  };

  if (quotes.isLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
          >
            <Loader2 className="w-12 h-12 animate-spin text-primary/50" />
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  if (!quote) {
    return (
      <MainLayout>
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <XCircle className="w-10 h-10 text-slate-300" />
          </div>
          <h2 className="text-4xl font-black mb-4 tracking-tight text-slate-900">Não encontramos nada</h2>
          <p className="text-slate-500 mb-8 max-w-md">Este orçamento pode ter sido removido ou o link está incorreto.</p>
          <Button onClick={() => navigate("/")} size="lg" className="rounded-2xl h-14 px-10 font-bold bg-slate-900 hover:bg-slate-800 transition-all shadow-xl">
            Explorar Orçamentos
          </Button>
        </div>
      </MainLayout>
    );
  }

  const total = getQuoteTotal(quote);
  const handleUpdateStatus = async (status: "aprovado" | "recusado" | "pendente") => {
    try {
      const promise = mutations.updateStatus.mutateAsync({ quoteId: quote.id, status });
      toast.promise(promise, {
        loading: 'Atualizando status...',
        success: `Status alterado para ${status}!`,
        error: 'Erro ao atualizar status.'
      });
      await promise;
      if (status === "aprovado" && boletoPlan) {
        await provisionReceivables();
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleUpdatePartialPayment = async (field: "down_payment_paid_at" | "final_payment_paid_at", received: boolean) => {
    if (!received) {
      // Direct removal if turning off
      try {
        const promise = mutations.updatePartialPayment.mutateAsync({ quoteId: quote.id, field, value: null });
        toast.promise(promise, {
          loading: 'Removendo pagamento...',
          success: 'Pagamento removido!',
          error: 'Erro ao remover pagamento.'
        });
        await promise;
      } catch (error) {
        console.error("Error removing payment:", error);
      }
      return;
    }

    // Open modal for date selection
    setDateModal({
      open: true,
      type: field,
      date: new Date(),
      isRemoving: false
    });
  };
  
  const handleUpdateFullPayment = async (received: boolean) => {
    if (!received) {
      try {
        const promise = mutations.updateFullPayment.mutateAsync({ quoteId: quote.id, value: null });
        toast.promise(promise, {
          loading: 'Removendo quitação...',
          success: 'Pagamentos removidos!',
          error: 'Erro ao remover quitação.'
        });
        await promise;
      } catch (error) {
        console.error("Error removing full payment:", error);
      }
      return;
    }

    setDateModal({
      open: true,
      type: "full",
      date: new Date(),
      isRemoving: false
    });
  };

  const confirmPayment = async () => {
    if (!dateModal.type || !quote) return;

    const value = dateModal.date.toISOString();
    const isFull = dateModal.type === "full";

    try {
      let promise;
      if (isFull) {
        promise = mutations.updateFullPayment.mutateAsync({ quoteId: quote.id, value });
      } else {
        promise = mutations.updatePartialPayment.mutateAsync({ 
          quoteId: quote.id, 
          field: dateModal.type as any, 
          value 
        });
      }

      toast.promise(promise, {
        loading: 'Processando...',
        success: isFull ? 'Pagamento total registrado!' : 'Pagamento registrado!',
        error: 'Erro ao processar.'
      });
      
      await promise;
      setDateModal({ ...dateModal, open: false });
    } catch (error) {
      console.error("Error updating payment:", error);
    }
  };

  const signatureUrl = settings.data?.signature_url || undefined;
  const companyLogo = settings.data?.logo_url || logo;

  return (
    <MainLayout>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-[1400px] mx-auto space-y-12 pb-24"
      >
        {/* Top Navigation Bar */}
        <motion.header variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-8 py-4">
          <div className="space-y-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")} 
              className="group -ml-4 h-12 px-4 rounded-xl hover:bg-slate-100 transition-all text-slate-500 font-bold"
            >
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              Painel Geral
            </Button>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="p-4 bg-white premium-border rounded-3xl shadow-sm">
                <FileText className="w-8 h-8 text-primary/60" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">
                    Orçamento <span className="text-slate-300 italic font-medium">#{quote.id.slice(0, 8)}</span>
                  </h1>
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate("/new", { state: { duplicateFrom: quote, isEditing: true } })} 
                    className="p-2 bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </motion.button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Origem: {leadOriginLabel(quote)}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1.5 text-slate-400 font-bold text-xs uppercase tracking-widest">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {new Date(quote.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                  <span className="w-1 h-1 bg-slate-200 rounded-full" />
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                    quote.status === "aprovado" ? "bg-emerald-100 text-emerald-600" : 
                    quote.status === "recusado" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                  )}>
                    {quote.status}
                  </div>
                  {(quote as any).payment_status && (
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1",
                      (quote as any).payment_status === "paid" ? "bg-emerald-500 text-white" :
                      (quote as any).payment_status === "pending" ? "bg-amber-500 text-white" :
                      "bg-slate-200 text-slate-600"
                    )}>
                      {(quote as any).payment_status === "paid" ? <CheckCircle2 className="w-3 h-3" /> : <Loader2 className="w-3 h-3 animate-spin" />}
                      {(quote as any).payment_status === "paid" ? "Pago" : "Pendente"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <Button 
              variant="outline" 
              className="h-14 rounded-2xl gap-3 px-8 font-black bg-white premium-border hover:shadow-premium-hover transition-all text-slate-700 hover:text-blue-600 group"
              onClick={() => {
                const text = formatWhatsApp(quote, settings.data?.nubank_pix_key, settings.data?.nubank_pix_name);
                navigator.clipboard.writeText(text);
                toast.success("Texto formatado copiado!");
              }}
            >
              <Copy className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" /> 
              Copiar WhatsApp
            </Button>
            <Button 
              className="h-14 rounded-2xl gap-3 px-8 font-black bg-slate-900 text-white hover:bg-slate-800 shadow-xl hover:shadow-2xl transition-all group"
              onClick={() => {
                const portalUrl = `${window.location.origin}/p/${quote.order_token || quote.id}`;
                const text = formatWhatsApp(quote, settings.data?.nubank_pix_key, settings.data?.nubank_pix_name, portalUrl);
                navigator.clipboard.writeText(text);
                toast.success("Texto + Link do Portal copiado!");
              }}
            >
              <Share2 className="w-5 h-5" />
              Compartilhar Link
            </Button>
          </div>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-10">
            {/* Client Info Card - Bento Item */}
            <motion.div variants={itemVariants} className="glass-card p-10 rounded-[3rem] relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none group-hover:scale-110 group-hover:rotate-6 transition-transform duration-1000">
                <User className="w-64 h-64 text-slate-900" />
              </div>

              <div className="relative z-10 grid md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div>
                    <span className="label-caps">Informações do Cliente</span>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{quote.client?.name}</h2>
                    <p className="text-slate-400 font-bold mt-2 flex items-center gap-2 uppercase text-[11px] tracking-widest">
                      <Phone className="w-3.5 h-3.5" /> {quote.client?.phone || "Não informado"}
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1 p-5 bg-slate-50/50 rounded-3xl border border-slate-100/50">
                      <span className="label-caps !mb-1 opacity-60">Status Interno</span>
                      <p className="font-black text-slate-900 flex items-center gap-2">
                        {quote.status === "aprovado" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <RefreshCw className="w-4 h-4 text-amber-500 animate-spin-slow" />}
                        {quote.status.toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {quote.delivery_address && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-primary/5 p-8 rounded-[2.5rem] border border-primary/10 hover:bg-primary/[0.07] transition-all"
                    >
                      <span className="label-caps !text-primary/70 flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" /> Endereço de Entrega
                      </span>
                      <p className="text-xl font-bold text-slate-800 leading-snug text-balance">
                        {quote.delivery_address}
                      </p>
                      {(() => {
                        const handleCopyAddr = async () => {
                          if (!quote.delivery_address?.trim()) {
                            toast.error("Sem endereço de entrega");
                            return false;
                          }
                          try {
                            await navigator.clipboard.writeText(quote.delivery_address);
                            setAddressCopied(true);
                            toast.success("Endereço copiado!");
                            setTimeout(() => setAddressCopied(false), 2500);
                            return true;
                          } catch {
                            toast.error("Não foi possível copiar");
                            return false;
                          }
                        };
                        const hasAddress = !!quote.delivery_address?.trim();
                        const encodedAddress = hasAddress ? encodeURIComponent(quote.delivery_address!.trim()) : "";
                        return (
                          <div className="grid grid-cols-2 gap-2 mt-5">
                            <button
                              type="button"
                              disabled={!hasAddress}
                              onClick={() => {
                                if (!hasAddress) {
                                  toast.error("Sem endereço de entrega");
                                  return;
                                }
                                const url = `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;
                                window.open(url, "_blank", "noopener,noreferrer");
                              }}
                              className="h-12 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] border-2 bg-[#33CCFF] border-[#33CCFF] text-white hover:bg-[#1FB8E8] hover:border-[#1FB8E8] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#33CCFF] disabled:hover:border-[#33CCFF]"
                              title={hasAddress ? "Abrir rota no Waze" : "Sem endereço de entrega"}
                            >
                              <MapPin className="w-4 h-4" />
                              WAZE
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const ok = await handleCopyAddr();
                                if (!ok) return;
                                const nickname = quote.client?.name ? `Entrega ${quote.client.name}` : "Entrega Melhoraço";
                                const url = `https://m.uber.com/ul/?action=setPickup&pickup=my_location` +
                                  `&dropoff[formatted_address]=${encodeURIComponent(quote.delivery_address!)}` +
                                  `&dropoff[nickname]=${encodeURIComponent(nickname)}` +
                                  `&product_id=uber-flash`;
                                window.open(url, "_blank", "noopener,noreferrer");
                              }}
                              className="h-12 rounded-2xl bg-black text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-black/90 transition-all active:scale-[0.98]"
                            >
                              <Zap className="w-4 h-4" />
                              UBER
                            </button>
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Generate InfinityPay link (only when no transaction yet) */}
            {!paymentTx && (
              <motion.div variants={itemVariants} className="glass-card rounded-[3rem] overflow-hidden">
                <div className="p-8 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <span className="label-caps !mb-1">Cobrança online</span>
                    <h3 className="text-xl font-black text-slate-900">Gerar link InfinityPay</h3>
                    <p className="text-xs text-slate-500 mt-1">Cartão de crédito, débito ou PIX via InfinityPay.</p>
                  </div>
                  <Button
                    onClick={handleCreateInfinityPayLink}
                    disabled={creatingLink}
                    className="gap-2 bg-primary hover:bg-primary/90 text-white h-12 px-6 rounded-2xl font-bold"
                  >
                    {creatingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    Gerar link — {formatCurrency(getQuoteTotal(quote))}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Payment Details - InfinityPay audit info */}
            {paymentTx && (
              <motion.div variants={itemVariants} className="glass-card rounded-[3rem] overflow-hidden">
                <div className="p-10 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="label-caps !mb-1">Pagamento {paymentTx.provider === "infinitypay" ? "InfinityPay" : paymentTx.provider}</span>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                      {paymentTx.status === "paid" ? (
                        <><CheckCircle2 className="w-7 h-7 text-emerald-500" /> Pago</>
                      ) : (
                        <><Loader2 className="w-7 h-7 text-amber-500 animate-spin" /> Aguardando pagamento</>
                      )}
                    </h3>
                  </div>
                  <div className={cn(
                    "px-4 py-2 rounded-2xl text-sm font-black uppercase",
                    paymentTx.status === "paid" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  )}>
                    {formatCurrency(paymentTx.amount)}
                  </div>
                </div>

                <div className="p-10 space-y-4">
                  {paymentTx.payment_link && paymentTx.status !== "paid" && (
                    <a
                      href={paymentTx.payment_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all group"
                    >
                      <span className="font-black flex items-center gap-3"><CreditCard className="w-5 h-5" /> Abrir link de pagamento</span>
                      <ExternalLink className="w-5 h-5 opacity-60 group-hover:opacity-100" />
                    </a>
                  )}

                  {paymentTx.status !== "paid" && paymentTx.provider === "infinitypay" && (
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => handleCheckPayment(false)}
                        disabled={checkingPayment}
                        className="h-14 rounded-2xl bg-primary hover:bg-primary/90 font-black"
                      >
                        {checkingPayment ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Verificar status
                      </Button>
                      <Button
                        onClick={() => handleCheckPayment(true)}
                        disabled={checkingPayment}
                        variant="outline"
                        className="h-14 rounded-2xl border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-black"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Confirmar manualmente
                      </Button>
                    </div>
                  )}

                  {paymentTx.provider === "infinitypay" && paymentTx.status !== "paid" && (
                    <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex items-center gap-2 text-slate-500 font-bold">
                        <RefreshCw className={cn("w-3.5 h-3.5", checkingPayment && "animate-spin")} />
                        {checkingPayment ? "Verificando…" : "Verificação automática a cada 20s"}
                      </div>
                      {lastCheck && (
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full font-black uppercase tracking-wider text-[10px]",
                            lastCheck.result === "paid" ? "bg-emerald-100 text-emerald-700" :
                            lastCheck.result === "error" ? "bg-red-100 text-red-700" :
                            "bg-amber-100 text-amber-700"
                          )}>
                            {lastCheck.result === "paid" ? "Sucesso" : lastCheck.result === "error" ? "Erro" : "Pendente"}
                          </span>
                          <span className="text-slate-400 font-mono">
                            {format(lastCheck.at, "dd/MM HH:mm:ss")}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {paymentTx.metadata?.receipt_url && (
                    <a
                      href={paymentTx.metadata.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-5 bg-emerald-50 text-emerald-700 rounded-2xl hover:bg-emerald-100 transition-all group"
                    >
                      <span className="font-black flex items-center gap-3"><FileText className="w-5 h-5" /> Ver comprovante</span>
                      <ExternalLink className="w-5 h-5 opacity-60 group-hover:opacity-100" />
                    </a>
                  )}

                  {paymentTx.status === "paid" && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      {paymentTx.metadata?.capture_method && (
                        <div className="p-4 bg-slate-50 rounded-2xl">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Método</p>
                          <p className="text-sm font-black text-slate-900 mt-1">
                            {paymentTx.metadata.capture_method === "credit_card" ? "Cartão de Crédito" :
                             paymentTx.metadata.capture_method === "pix" ? "PIX" : paymentTx.metadata.capture_method}
                            {paymentTx.metadata.installments > 1 && ` • ${paymentTx.metadata.installments}x`}
                          </p>
                        </div>
                      )}
                      {paymentTx.metadata?.paid_amount && (
                        <div className="p-4 bg-slate-50 rounded-2xl">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor Recebido</p>
                          <p className="text-sm font-black text-slate-900 mt-1">{formatCurrency(paymentTx.metadata.paid_amount / 100)}</p>
                        </div>
                      )}
                      {paymentTx.metadata?.transaction_nsu && (
                        <div className="p-4 bg-slate-50 rounded-2xl col-span-2">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">NSU da Transação</p>
                          <p className="text-xs font-mono text-slate-700 mt-1 break-all">{paymentTx.metadata.transaction_nsu}</p>
                        </div>
                      )}
                      {paymentTx.metadata?.invoice_slug && (
                        <div className="p-4 bg-slate-50 rounded-2xl col-span-2">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Invoice Slug</p>
                          <p className="text-xs font-mono text-slate-700 mt-1 break-all">{paymentTx.metadata.invoice_slug}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Items List - Bento Item */}
            <motion.div variants={itemVariants} className="glass-card rounded-[3rem] overflow-hidden">

              <div className="p-10 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="label-caps !mb-1">Detalhamento Financeiro</span>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Produtos e Serviços</h3>
                </div>
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                  <Package className="w-6 h-6 text-slate-400" />
                </div>
              </div>

              <div className="divide-y divide-slate-50">
                {quote.items.map((item, i) => (
                  <motion.div 
                    key={i} 
                    whileHover={{ backgroundColor: "rgba(248, 250, 252, 0.5)" }}
                    className="p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-colors"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-white premium-border rounded-2xl flex items-center justify-center font-black text-slate-300 shadow-sm text-lg">
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-slate-900">{item.product_name}</h4>
                        <div className="flex items-center gap-3 mt-1 text-slate-400 font-bold text-sm">
                          <span>{item.quantity} un</span>
                          <span className="w-1 h-1 bg-slate-200 rounded-full" />
                          <span>{formatCurrency(item.unit_price)} / un</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-slate-900 tracking-tighter">
                        {formatCurrency(item.unit_price * item.quantity)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Extra Fees */}
              {(quote.delivery_fee > 0 || quote.installation_fee > 0) && (
                <div className="bg-slate-50/50 p-10 space-y-4">
                  {quote.delivery_fee > 0 && (
                    <div className="flex justify-between items-center px-4">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Logística e Entrega</span>
                      <span className="text-lg font-black text-slate-700">{formatCurrency(quote.delivery_fee)}</span>
                    </div>
                  )}
                  {quote.installation_fee > 0 && (
                    <div className="flex justify-between items-center px-4">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Serviço de Instalação</span>
                      <span className="text-lg font-black text-slate-700">{formatCurrency(quote.installation_fee)}</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-4 space-y-10">
            {/* Total & Main Action Card */}
            <motion.div 
              variants={itemVariants} 
              className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group flex flex-col"
            >
              <div className="absolute -bottom-20 -right-20 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-1000">
                <DollarSign className="w-80 h-80" />
              </div>
              
              <div className="relative z-10">
                <span className="label-caps !text-white/40 !mb-1">Valor Final Acordado</span>
                <h3 className="text-5xl font-black tracking-tighter mb-12 flex items-baseline gap-2">
                  <span className="text-2xl font-medium opacity-50">R$</span>
                  {formatCurrency(total).replace('R$', '').trim()}
                </h3>
                
                <div className="space-y-4">
                  {quote.status !== "aprovado" ? (
                    <div className="grid gap-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleUpdateStatus("aprovado")}
                        className="w-full h-18 py-5 rounded-3xl font-black bg-emerald-500 hover:bg-emerald-400 transition-all flex items-center justify-center gap-3 text-lg shadow-lg shadow-emerald-500/20"
                      >
                        <CheckCircle2 className="w-6 h-6" /> Aprovar Orçamento
                      </motion.button>
                      <Button 
                        variant="ghost" 
                        onClick={() => handleUpdateStatus("recusado")}
                        className="w-full h-14 rounded-2xl font-bold text-white/50 hover:text-red-400 hover:bg-white/5"
                      >
                        <XCircle className="w-5 h-5 mr-2" /> Recusar Proposta
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                       {boletoPlan ? (
                         <div className="space-y-3">
                           <div className="flex items-center justify-between gap-3">
                             <label className="label-caps !text-white/40 !mb-0">Contas a receber</label>
                             <span className="text-xs font-black text-white/60">{boletoPlan.installments}x no boleto</span>
                           </div>
                           {receivablesQuery.isLoading ? (
                             <div className="h-20 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-white/50" /></div>
                           ) : receivablesQuery.data?.length ? (
                             receivablesQuery.data.map((receivable) => {
                               const paid = receivable.status === "pago";
                               return (
                                 <Button
                                   key={receivable.id}
                                   variant="ghost"
                                   onClick={async () => {
                                     try {
                                       await setReceivableStatus(receivable.id, !paid);
                                       toast.success(paid ? "Parcela reaberta" : "Parcela recebida");
                                     } catch (error) {
                                       toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a parcela");
                                     }
                                   }}
                                   className={cn(
                                     "w-full h-auto min-h-16 p-4 rounded-2xl border justify-between text-left",
                                     paid ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-white/5 border-white/10 text-white hover:bg-white/10",
                                   )}
                                 >
                                   <span className="flex items-center gap-3 min-w-0">
                                     {paid ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <ReceiptText className="w-5 h-5 shrink-0" />}
                                     <span>
                                       <span className="block font-black">Parcela {receivable.installment_number}/{receivable.total_installments}</span>
                                       <span className="block text-[11px] opacity-60">Vence em {new Date(receivable.due_date ?? receivable.transaction_date).toLocaleDateString("pt-BR")}</span>
                                     </span>
                                   </span>
                                   <span className="font-black whitespace-nowrap">{formatCurrency(Number(receivable.amount))}</span>
                                 </Button>
                               );
                             })
                           ) : (
                             <Button
                               onClick={async () => {
                                 try {
                                   await provisionReceivables();
                                   toast.success("Parcelas provisionadas no financeiro");
                                 } catch (error) {
                                   toast.error(error instanceof Error ? error.message : "Não foi possível provisionar as parcelas");
                                 }
                               }}
                               className="w-full h-14 rounded-2xl font-black"
                             >
                               <ReceiptText className="w-5 h-5 mr-2" /> Provisionar {boletoPlan.installments} parcelas
                             </Button>
                           )}
                         </div>
                       ) : (
                       <div className="space-y-3">
                        <label className="label-caps !text-white/30 !mb-2">Controle de Fluxo de Caixa</label>
                        
                        {/* Full Payment Button */}
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleUpdateFullPayment(!(quote.down_payment_paid_at && quote.final_payment_paid_at))} 
                          className={cn(
                            "w-full p-5 rounded-3xl flex items-center justify-between border-2 transition-all group/btn",
                            (quote.down_payment_paid_at && quote.final_payment_paid_at)
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                              : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                          )}
                        >
                          <div className="flex items-center gap-4 text-left">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                              (quote.down_payment_paid_at && quote.final_payment_paid_at) ? "bg-emerald-500 text-slate-900" : "bg-white/10 text-white"
                            )}>
                              {(quote.down_payment_paid_at && quote.final_payment_paid_at) ? <CheckCircle2 className="w-6 h-6" /> : <DollarSign className="w-6 h-6" />}
                            </div>
                            <div>
                              <p className="font-black text-sm uppercase tracking-wider">Valor Total Recebido</p>
                              <p className="text-[10px] opacity-60 font-bold tracking-widest">{(quote.down_payment_paid_at && quote.final_payment_paid_at) ? "QUITAÇÃO COMPLETA" : "RECEBER TUDO AGORA"}</p>
                            </div>
                          </div>
                          <ChevronRight className={cn("w-5 h-5 opacity-30 group-hover/btn:opacity-100 transition-all", (quote.down_payment_paid_at && quote.final_payment_paid_at) && "rotate-90 opacity-100")} />
                        </motion.button>

                        {/* Down Payment Button */}
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleUpdatePartialPayment("down_payment_paid_at", !quote.down_payment_paid_at)} 
                          className={cn(
                            "w-full p-5 rounded-3xl flex items-center justify-between border-2 transition-all group/btn",
                            quote.down_payment_paid_at 
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                              : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                          )}
                        >
                          <div className="flex items-center gap-4 text-left">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                              quote.down_payment_paid_at ? "bg-emerald-500 text-slate-900" : "bg-white/10 text-white"
                            )}>
                              {quote.down_payment_paid_at ? <CheckCircle2 className="w-6 h-6" /> : <CreditCard className="w-6 h-6" />}
                            </div>
                            <div>
                              <p className="font-black text-sm uppercase tracking-wider">Sinal Recebido</p>
                              <p className="text-[10px] opacity-60 font-bold tracking-widest">{quote.down_payment_paid_at ? "CONFIRMADO EM CONTA" : "AGUARDANDO DEPÓSITO"}</p>
                            </div>
                          </div>
                          <ChevronRight className={cn("w-5 h-5 opacity-30 group-hover/btn:opacity-100 transition-all", quote.down_payment_paid_at && "rotate-90 opacity-100")} />
                        </motion.button>

                        {/* Final Payment Button */}
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleUpdatePartialPayment("final_payment_paid_at", !quote.final_payment_paid_at)} 
                          className={cn(
                            "w-full p-5 rounded-3xl flex items-center justify-between border-2 transition-all group/btn",
                            quote.final_payment_paid_at 
                              ? "bg-blue-500/10 border-blue-500/30 text-blue-400" 
                              : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                          )}
                        >
                          <div className="flex items-center gap-4 text-left">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                              quote.final_payment_paid_at ? "bg-blue-500 text-white" : "bg-white/10 text-white"
                            )}>
                              {quote.final_payment_paid_at ? <CheckCircle2 className="w-6 h-6" /> : <DollarSign className="w-6 h-6" />}
                            </div>
                            <div>
                              <p className="font-black text-sm uppercase tracking-wider">Restante Recebido</p>
                              <p className="text-[10px] opacity-60 font-bold tracking-widest">{quote.final_payment_paid_at ? "QUITAÇÃO TOTAL" : "VALOR PENDENTE"}</p>
                            </div>
                          </div>
                          <ChevronRight className={cn("w-5 h-5 opacity-30 group-hover/btn:opacity-100 transition-all", quote.final_payment_paid_at && "rotate-90 opacity-100")} />
                        </motion.button>
                       </div>
                       )}

                      {quote.down_payment_paid_at && !quote.final_payment_paid_at && (
                        <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex flex-col gap-2">
                           <div className="flex justify-between items-center">
                             <span className="text-[11px] font-black uppercase text-amber-500 tracking-[0.2em]">Aguardando</span>
                             <span className="font-black text-amber-500 text-xl tracking-tighter">{formatCurrency(total - (quote.down_payment || 0))}</span>
                           </div>
                           <div className="h-1.5 bg-amber-500/20 rounded-full overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${((quote.down_payment || 0) / total) * 100}%` }}
                               className="h-full bg-amber-500" 
                             />
                           </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Documents & Exports */}
            <motion.div variants={itemVariants} className="glass-card p-10 rounded-[3rem] space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <ExternalLink className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Exportação Premium</h3>
              </div>

              <div className="grid gap-3">
                <LazyPdfButton
                  fileName={`orcamento-${quote.id.slice(0, 8)}.pdf`}
                  className="w-full"
                  documentFactory={async () => {
                    const { QuotePDF } = await import("@/components/QuotePDF");
                    return <QuotePDF quote={quote} logoUrl={companyLogo} signatureUrl={signatureUrl} />;
                  }}
                >
                  <Button asChild variant="outline" className="w-full h-15 py-7 rounded-2xl gap-4 font-black border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200 transition-all group">
                    <span><FileText className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform" /> Exportar Orçamento PDF</span>
                  </Button>
                </LazyPdfButton>

                {quote.status === "aprovado" && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    <LazyPdfButton
                      fileName={`os-${quote.id.slice(0, 8)}.pdf`}
                      className="w-full"
                      documentFactory={async () => {
                        const { ServiceOrderPDF } = await import("@/components/ServiceOrderPDF");
                        return <ServiceOrderPDF quote={quote} logoUrl={companyLogo} signatureUrl={signatureUrl} />;
                      }}
                    >
                      <Button asChild variant="outline" className="w-full h-15 py-7 rounded-2xl gap-4 font-black border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200 transition-all group">
                        <span><ClipboardList className="w-6 h-6 text-orange-500 group-hover:scale-110 transition-transform" /> Ordem de Serviço (O.S)</span>
                      </Button>
                    </LazyPdfButton>

                    {(quote.down_payment_paid_at || quote.final_payment_paid_at) && (
                      <LazyPdfButton
                        fileName={`recibo-${quote.id.slice(0, 8)}.pdf`}
                        className="w-full"
                        documentFactory={async () => {
                          const { ReceiptPDF } = await import("@/components/ReceiptPDF");
                          return <ReceiptPDF quote={quote} logoUrl={companyLogo} signatureUrl={signatureUrl} type={quote.final_payment_paid_at ? "full" : "down_payment"} />;
                        }}
                      >
                        <Button asChild variant="outline" className="w-full h-15 py-7 rounded-2xl gap-4 font-black border-emerald-100 bg-emerald-50/20 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 transition-all group">
                          <span><Printer className="w-6 h-6 group-hover:rotate-12 transition-transform" /> Emitir Recibo {quote.final_payment_paid_at ? "Total" : "Parcial"}</span>
                        </Button>
                      </LazyPdfButton>
                    )}
                  </motion.div>
                )}

                <ContractSection quote={quote} logoUrl={companyLogo} signatureUrl={signatureUrl} />
                <InstallationSection quote={quote} />
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <Dialog open={dateModal.open} onOpenChange={(open) => setDateModal(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-8 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">
              Selecionar Data de Recebimento
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              Informe quando este valor entrou em conta para o controle financeiro.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center py-4">
            <Calendar
              mode="single"
              selected={dateModal.date}
              onSelect={(date) => date && setDateModal(prev => ({ ...prev, date }))}
              locale={ptBR}
              className="rounded-3xl border border-slate-100 shadow-sm"
              initialFocus
            />
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={() => setDateModal(prev => ({ ...prev, open: false }))}
              className="flex-1 h-14 rounded-2xl font-bold border-slate-100 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button 
              onClick={confirmPayment}
              className="flex-1 h-14 rounded-2xl font-black bg-slate-900 hover:bg-slate-800 text-white shadow-xl"
            >
              Confirmar Recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default QuoteViewPage;
