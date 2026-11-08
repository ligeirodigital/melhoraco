import React, { useState } from "react";
import { MainLayout } from "@/components/MainLayout";
import { useProjectData } from "@/hooks/useProjectData";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/formatQuote";
import { useNavigate } from "react-router-dom";
import { UserCircle, DollarSign, ArrowRight, MessageSquare, Clock, Layers, Plus, Calendar, Save, X, Info, TrendingUp, AlertCircle, Percent, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { upsertClient, saveFullQuote } from "@/lib/cloudStore";
import { useAuth } from "@/hooks/useAuth";
import { getStageTemplate, openWhatsApp } from "@/lib/whatsappTemplates";

const PipelinePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { quotes, pipelineStages, mutations } = useProjectData();
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [newLead, setNewLead] = useState({
    name: "",
    phone: "",
    notes: "",
    expectedBuyDate: "",
    estimatedValue: "0"
  });

  if (quotes.isLoading || pipelineStages.isLoading) return <PipelineSkeleton />;

  const stages = pipelineStages.data || [];
  const quotesData = quotes.data || [];

  const handleDragStart = (e: React.DragEvent, quoteId: string) => {
    e.dataTransfer.setData("quoteId", quoteId);
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const quoteId = e.dataTransfer.getData("quoteId");
    if (quoteId) {
      mutations.updateStage.mutate({ quoteId, stageId });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSaveLead = async () => {
    if (!user) return;
    if (!newLead.name) return toast.error("Informe o nome do cliente");

    try {
      const client = await upsertClient(user.id, { 
        name: newLead.name, 
        phone: newLead.phone,
      });

      await saveFullQuote(user.id, {
        clientId: client.id,
        deliveryFee: 0,
        installationFee: 0,
        deliveryAddress: "",
        deadline: "",
        items: [],
        isLead: true,
        notes: newLead.notes,
        expectedBuyDate: newLead.expectedBuyDate,
        pipelineStageId: stages[0]?.id
      });
      
      setIsAddLeadOpen(false);
      setNewLead({ name: "", phone: "", notes: "", expectedBuyDate: "", estimatedValue: "0" });
      quotes.refetch();
      toast.success("Lead adicionado ao funil!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-8 space-y-6 h-full flex flex-col max-w-[1600px] mx-auto overflow-hidden animate-in fade-in duration-500">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground">Funil de Vendas</h1>
            <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest">Gestão de Negociações</p>
          </div>

          <div className="flex items-center gap-3">
            <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
              <DialogTrigger asChild>
                <Button className="h-12 rounded-2xl font-bold px-6 bg-primary shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                  <Plus className="w-5 h-5 mr-2" /> NOVO LEAD
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border text-foreground rounded-3xl max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black tracking-tight">Novo Lead Manual</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="label-caps px-1">Nome do Cliente</label>
                    <Input 
                      value={newLead.name} 
                      onChange={e => setNewLead({...newLead, name: e.target.value})}
                      className="bg-muted border-none h-14 rounded-2xl font-medium px-6"
                      placeholder="Ex: Roberto Alencar"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="label-caps px-1">WhatsApp</label>
                    <Input 
                      value={newLead.phone} 
                      onChange={e => setNewLead({...newLead, phone: e.target.value})}
                      className="bg-muted border-none h-14 rounded-2xl font-medium px-6"
                      placeholder="85999998888"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="label-caps px-1">Números / Observações</label>
                    <Textarea 
                      value={newLead.notes} 
                      onChange={e => setNewLead({...newLead, notes: e.target.value})}
                      className="bg-muted border-none rounded-2xl font-medium px-6 min-h-[100px]"
                      placeholder="Ex: Precisa de 4 números 3D polidos (1, 5, 8, 9)"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="label-caps px-1">Previsão de Compra</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        type="date"
                        value={newLead.expectedBuyDate} 
                        onChange={e => setNewLead({...newLead, expectedBuyDate: e.target.value})}
                        className="bg-muted border-none h-14 rounded-2xl font-medium pl-12 pr-6"
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveLead} className="w-full h-16 rounded-2xl font-black mt-4 text-lg">CADASTRAR NO FUNIL</Button>
                </div>
              </DialogContent>
            </Dialog>
            <div className="flex items-center gap-3 bg-card p-2 px-4 rounded-2xl border border-border shadow-sm">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Geral</span>
              <span className="text-lg font-black text-primary">
                {formatCurrency(quotesData.reduce((acc, q) => acc + (q.items?.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) || 0), 0))}
              </span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card p-4 rounded-2xl border border-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total no Funil</p>
              <p className="text-xl font-black text-foreground">
                {formatCurrency(quotesData.reduce((acc, q) => acc + (q.items?.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) || 0), 0))}
              </p>
            </div>
          </div>
          <div className="bg-card p-4 rounded-2xl border border-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ticket Médio</p>
              <p className="text-xl font-black text-foreground">
                {formatCurrency(quotesData.length > 0 ? (quotesData.reduce((acc, q) => acc + (q.items?.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) || 0), 0) / quotesData.length) : 0)}
              </p>
            </div>
          </div>
          <div className="bg-card p-4 rounded-2xl border border-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Aguardando Follow-up</p>
              <p className="text-xl font-black text-foreground">
                {quotesData.filter(q => {
                  const days = Math.floor((new Date().getTime() - new Date(q.updated_at).getTime()) / (1000 * 60 * 60 * 24));
                  return days >= 3;
                }).length} clientes
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-6 overflow-x-auto pb-8 h-full no-scrollbar select-none">

          {stages.map((stage) => {
            const stageQuotes = quotesData.filter(q => q.pipeline_stage_id === stage.id);
            const totalValue = stageQuotes.reduce((acc, q) => {
                return acc + (q.items?.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) || 0);
            }, 0);

            return (
              <div 
                key={stage.id} 
                className="flex-shrink-0 w-80 flex flex-col gap-4"
                onDrop={(e) => handleDrop(e, stage.id)}
                onDragOver={handleDragOver}
              >
                <div className="flex items-center justify-between px-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    <h3 className="font-black text-sm uppercase tracking-widest text-foreground">{stage.name}</h3>
                  </div>
                  <span className="bg-primary/10 text-primary text-[10px] font-black px-2.5 py-1 rounded-full border border-primary/20">
                    {stageQuotes.length}
                  </span>
                </div>
                
                <div className="bg-muted/40 p-3 rounded-[2rem] border border-border/60 flex-1 min-h-[500px] space-y-4 backdrop-blur-sm">
                  <div className="p-3.5 bg-background/60 rounded-2xl border border-border/40 flex justify-between items-center shadow-sm">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Valor Acumulado</span>
                    <span className="text-xs font-black text-foreground">{formatCurrency(totalValue)}</span>
                  </div>

                  <div className="space-y-3">
                    {stageQuotes.map((quote) => {
                      const quoteValue = quote.items?.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) || 0;
                      // Use fixed_cost if available, fallback to current product cost
                      const quoteCost = quote.items?.reduce((sum, item) => sum + ((Number(item.fixed_cost) || Number(item.product?.cost) || 0) * item.quantity), 0) || 0;

                      const margin = quoteValue > 0 ? ((quoteValue - quoteCost) / quoteValue) * 100 : 0;
                      
                      const updatedDate = new Date(quote.updated_at);
                      const daysInStage = Math.floor((new Date().getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));
                      
                      const isStale = daysInStage >= 3;
                      const isCritical = daysInStage >= 7;

                      
                      return (
                        <div
                          key={quote.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, quote.id)}
                          onClick={() => navigate(`/quotes/${quote.id}`)}
                          className={cn(
                            "bg-card p-5 rounded-2xl border border-border shadow-sm hover:shadow-xl hover:border-primary/40 hover:-translate-y-1 transition-all cursor-grab active:cursor-grabbing group animate-in fade-in zoom-in-95 duration-200 relative",
                            quote.is_lead && "border-l-4 border-l-primary",
                            isCritical && "bg-red-50/30 border-red-200",
                            !isCritical && isStale && "bg-yellow-50/30 border-yellow-200"
                          )}
                        >
                          {isStale && (
                            <div className={cn(
                              "absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-sm animate-bounce",
                              isCritical ? "bg-red-500 text-white" : "bg-yellow-500 text-white"
                            )}>
                              <AlertCircle className="w-4 h-4" />
                            </div>
                          )}

                          <div className="space-y-4">
                            <div className="flex justify-between items-start gap-2">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-black text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors leading-none">
                                    {quote.client?.name}
                                  </p>
                                  {quote.is_lead && (
                                    <Badge variant="secondary" className="text-[8px] h-4 px-1 uppercase font-black">LEAD</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <UserCircle className="w-3 h-3 opacity-70" />
                                  <span className="text-[10px] font-bold truncate">
                                    {quote.client?.phone || 'Sem contato'}
                                  </span>
                                </div>
                              </div>
                              <div className="bg-muted p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                <ArrowRight className="w-3.5 h-3.5 text-primary" />
                              </div>
                            </div>

                            {(quote.notes || quote.expected_buy_date) && (
                              <div className="bg-muted/30 p-3 rounded-xl space-y-2 border border-border/30">
                                {quote.notes && (
                                  <div className="flex gap-2">
                                    <Info className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-muted-foreground font-medium line-clamp-2 italic leading-tight">
                                      {quote.notes}
                                    </p>
                                  </div>
                                )}
                                {quote.expected_buy_date && (
                                  <div className="flex items-center gap-2 text-primary font-black text-[9px] uppercase tracking-tighter">
                                    <Calendar className="w-3 h-3" />
                                    Compra: {new Date(quote.expected_buy_date).toLocaleDateString('pt-BR')}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <div className="pt-3 flex justify-between items-center border-t border-border/50">
                               <div className="flex flex-col">
                                 <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Valor</span>
                                 <div className="flex items-center gap-2">
                                   <p className="font-black text-sm text-foreground">
                                     {quoteValue > 0 ? formatCurrency(quoteValue) : "Sob Consulta"}
                                   </p>
                                   {quoteValue > 0 && (
                                     <div className={cn(
                                       "flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-black",
                                       margin > 40 ? "bg-green-100 text-green-700" : margin > 20 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                                     )}>
                                       <Percent className="w-2.5 h-2.5" />
                                       {Math.round(margin)}%
                                     </div>
                                   )}
                                 </div>
                                </div>

                                <div className={cn(
                                  "flex flex-col items-end gap-0.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight",
                                  isStale ? "text-orange-500" : "text-muted-foreground"
                                )}>
                                 <div className="flex items-center gap-1">
                                   <Clock className="w-3 h-3" />
                                   {daysInStage === 0 ? "Hoje" : `${daysInStage}d parado`}
                                 </div>
                                 <span className="text-[8px] opacity-70">
                                   {updatedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                 </span>
                                </div>

                            </div>

                            <div
                              className="flex gap-2 pt-2 border-t border-border/40"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                disabled={!quote.client?.phone}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const text = getStageTemplate(stage.name, {
                                    clientName: quote.client?.name,
                                    companyName: "Melhoraço",
                                    quoteNumber: (quote as any).quote_number ?? quote.id.slice(0, 6),
                                    daysStale: daysInStage,
                                  });
                                  const ok = openWhatsApp(quote.client?.phone, text);
                                  if (!ok) toast.error("Cliente sem telefone cadastrado");
                                  else {
                                    mutations.markFollowUp.mutate(quote.id);
                                    toast.success("WhatsApp aberto e follow-up registrado");
                                  }
                                }}
                                className="flex-1 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95"
                              >
                                <MessageSquare className="w-3 h-3" />
                                Enviar WhatsApp
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  mutations.markFollowUp.mutate(quote.id, {
                                    onSuccess: () => toast.success("Follow-up marcado"),
                                  });
                                }}
                                title="Marcar follow-up feito"
                                className="h-8 px-2.5 rounded-lg bg-muted hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground flex items-center justify-center transition-all active:scale-95"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {stageQuotes.length === 0 && (
                    <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-border/40 rounded-3xl opacity-40 bg-background/20 gap-2">
                       <Layers className="w-5 h-5 text-muted-foreground" />
                       <p className="text-[9px] font-black uppercase tracking-[0.2em]">Sem Cards</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
};

const PipelineSkeleton = () => (
  <MainLayout>
    <div className="p-8 space-y-8 h-full">
      <Skeleton className="h-10 w-64 rounded-xl" />
      <div className="flex gap-6 overflow-hidden h-full">
        {[1,2,3,4].map(i => (
          <Skeleton key={i} className="w-80 h-[600px] rounded-3xl shrink-0" />
        ))}
      </div>
    </div>
  </MainLayout>
);

export default PipelinePage;
