import { ShieldCheck, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Registro de atividades das Ajustes (somente leitura). */
export function ActivityLogsPanel({ activityLogs, onRefresh }: { activityLogs: { data?: any[] | null } | undefined; onRefresh: () => void }) {
  return (
    <>


          <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-right-4 duration-500">
             <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/40 space-y-10">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                         <ShieldCheck className="w-8 h-8" />
                      </div>
                      <div>
                         <h2 className="text-2xl font-black tracking-tighter text-slate-900">Log de Auditoria</h2>
                         <p className="text-sm font-bold text-slate-400">Rastro completo de ações no sistema</p>
                      </div>
                   </div>
                   <Button variant="outline" size="sm" onClick={onRefresh} className="rounded-xl border-2">
                      <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
                   </Button>
                </div>

                <div className="space-y-4">
                   {activityLogs?.data?.map((log) => (
                      <div key={log.id} className="p-6 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-all flex items-start gap-6">
                         <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                            <Clock className="w-5 h-5" />
                         </div>
                         <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                               <span className="font-black text-slate-900">{log.user_email}</span>
                               <span className="text-[10px] font-bold text-white bg-primary px-2 py-0.5 rounded-full uppercase">{log.action}</span>
                            </div>
                            <p className="text-sm font-medium text-slate-600">
                               Modificou {log.entity_type} <span className="font-mono text-xs bg-slate-200 px-1.5 py-0.5 rounded">#{log.entity_id?.slice(0, 8)}</span>
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                               {new Date(log.created_at).toLocaleString('pt-BR')}
                            </p>
                         </div>
                      </div>
                   ))}
                   {(!activityLogs?.data || activityLogs.data.length === 0) && (
                      <div className="text-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed">
                         <p className="text-slate-400 font-bold">Nenhuma atividade registrada ainda.</p>
                      </div>
                   )}
                </div>
             </div>
          </div>
    </>
  );
}
