import React, { useState, useMemo } from "react";
import { MainLayout } from "@/components/MainLayout";
import { useProjectData } from "@/hooks/useProjectData";
import {
  Users,
  Search,
  Calendar,
  Phone,
  UserCircle,
  Send,
  History as HistoryIcon,
  StickyNote,
  Info,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/formatQuote";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

const InteractionList = ({ clientId }: { clientId: string | null }) => {
  const { getInteractions } = useProjectData();
  const { data: list, isLoading } = getInteractions(clientId || "");

  if (!clientId) return null;
  if (isLoading) return <div className="space-y-4">{[1, 2].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>;

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto pr-2 scrollbar-thin">
      {(list ?? []).map((item: any) => (
        <div key={item.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/50 space-y-2">
          <div className="flex justify-between items-start">
            <span className="label-caps">
              {new Date(item.created_at).toLocaleString('pt-BR')}
            </span>
            <StickyNote className="w-3.5 h-3.5 text-slate-600" />
          </div>
          <p className="text-sm font-medium text-slate-700">{item.content}</p>
        </div>
      ))}
      {(!list || list.length === 0) && (
        <p className="text-center py-10 text-slate-600 font-bold italic text-sm">Nenhuma interação registrada.</p>
      )}
    </div>
  );
};

const ClientItem = ({ client, onShowHistory }: any) => {
  return (
    <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-sm hover:border-primary/20 transition-all">
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl md:rounded-3xl flex items-center justify-center text-slate-400">
          <UserCircle className="w-10 h-10" />
        </div>
        <div className="space-y-1">
          <h3 className="font-black text-xl md:text-2xl text-slate-900 leading-tight">{client.client_name}</h3>
          <div className="flex items-center gap-4 text-slate-400 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest">
              <Phone className="w-3.5 h-3.5" /> {client.client_phone || "Sem fone"}
            </span>
            <span className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest">
              <Calendar className="w-3.5 h-3.5" /> Última compra: {client.last_order_date ? new Date(client.last_order_date).toLocaleDateString('pt-BR') : 'Nunca'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:flex lg:items-center lg:gap-10 pt-6 lg:pt-0 border-t border-slate-100 lg:border-none">
        <div className="space-y-0.5">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Gasto</p>
          <p className="font-black text-xl text-slate-900">{formatCurrency(client.total_revenue)}</p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pedidos</p>
          <div className="flex items-center gap-2">
            <span className="font-black text-xl text-slate-900">{client.approved_quotes}</span>
            <span className="text-[10px] font-bold text-slate-400">/ {client.total_quotes} total</span>
          </div>
        </div>
        <button
          onClick={() => onShowHistory()}
          className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-primary hover:text-white transition-all"
          title="Histórico / CRM"
        >
          <HistoryIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

const ClientsPage = () => {
  const { clientInsights, mutations } = useProjectData();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedClientHistory, setSelectedClientHistory] = useState<string | null>(null);
  const [newInteraction, setNewInteraction] = useState("");

  const filtered = useMemo(() =>
    (clientInsights.data ?? []).filter(c =>
      c.client_name?.toLowerCase().includes(search.toLowerCase())
    ), [clientInsights.data, search]);

  if (clientInsights.isLoading) return <ClientsSkeleton />;

  return (
    <MainLayout>
      <div className="p-4 md:p-10 space-y-10 animate-in fade-in duration-500 max-w-6xl mx-auto pb-32">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900">Clientes</h1>
            <p className="text-slate-500 font-bold text-sm">Visão automática a partir dos orçamentos</p>
          </div>
        </header>

        <div className="flex items-start gap-3 bg-blue-50/60 border border-blue-100 text-blue-700 p-4 rounded-2xl text-xs font-bold">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <p>Esta lista é gerada automaticamente a partir dos orçamentos. Para cadastrar ou editar um cliente, crie ou edite um orçamento.</p>
        </div>

        <div className="relative group">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
            <Search className="w-6 h-6" />
          </div>
          <Input
            placeholder="Buscar cliente pelo nome..."
            className="pl-16 h-16 md:h-20 rounded-2xl md:rounded-[2.5rem] border-none bg-white text-lg md:text-xl font-bold text-slate-900 placeholder:text-slate-400 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-primary/10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="grid gap-6">
          {filtered.map(client => (
            <ClientItem
              key={client.client_id}
              client={client}
              onShowHistory={() => setSelectedClientHistory(client.client_id)}
            />
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-24 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200 flex flex-col items-center gap-6">
              <Users className="w-12 h-12 text-slate-400" />
              <p className="text-slate-500 font-bold">Nenhum cliente encontrado.</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!selectedClientHistory} onOpenChange={(open) => !open && setSelectedClientHistory(null)}>
        <DialogContent className="bg-white border-slate-100 text-slate-900 rounded-3xl max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Histórico e CRM</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-500">Nova Anotação / Interação</label>
              <div className="flex gap-2">
                <Input
                  value={newInteraction}
                  onChange={e => setNewInteraction(e.target.value)}
                  placeholder="Descreva o contato ou observação..."
                  className="bg-slate-50 border-none h-12 rounded-xl flex-1 text-slate-900"
                />
                <Button
                  onClick={() => {
                    mutations.addInteraction.mutate({
                      client_id: selectedClientHistory!,
                      content: newInteraction,
                      created_by: user?.id
                    });
                    setNewInteraction("");
                  }}
                  className="rounded-xl px-6 font-black"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                <HistoryIcon className="w-3.5 h-3.5" /> Linha do Tempo
              </h4>
              <InteractionList clientId={selectedClientHistory} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

const ClientsSkeleton = () => (
  <MainLayout>
    <div className="p-4 md:p-10 space-y-10 max-w-6xl mx-auto">
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-16 w-full rounded-[2.5rem]" />
      <div className="space-y-6">
        {[1,2,3].map(i => <Skeleton key={i} className="h-40 w-full rounded-[2.5rem]" />)}
      </div>
    </div>
  </MainLayout>
);

export default ClientsPage;
