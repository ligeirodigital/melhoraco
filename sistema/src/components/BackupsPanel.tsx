import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, FN_PREFIX } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, RefreshCcw, Play, HardDrive, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { reportError } from "@/lib/reportError";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type BackupFile = { name: string; created_at?: string; metadata?: { size?: number } };

function formatSize(bytes?: number) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function BackupsPanel() {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [downloadingName, setDownloadingName] = useState<string | null>(null);

  const backups = useQuery({
    queryKey: ["backups-list"],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("backups")
        .list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;
      return (data ?? []) as BackupFile[];
    },
  });

  const runNow = async () => {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke(`${FN_PREFIX}weekly-backup`, {
        body: {},
      });
      if (error) throw error;
      toast.success("Backup gerado com sucesso");
      await qc.invalidateQueries({ queryKey: ["backups-list"] });
    } catch (e) {
      reportError(e, { scope: "weekly-backup/run-now" });
    } finally {
      setRunning(false);
    }
  };

  const download = async (name: string) => {
    setDownloadingName(name);
    try {
      const { data, error } = await supabase.storage
        .from("backups")
        .createSignedUrl(name, 300);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (e) {
      reportError(e, { scope: "weekly-backup/download" });
    } finally {
      setDownloadingName(null);
    }
  };

  const files = backups.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Backups</h2>
          <p className="text-sm text-slate-500 mt-1">
            Snapshots semanais das tabelas críticas em ZIP. Mantidos os 8 últimos.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => backups.refetch()}
            disabled={backups.isFetching}
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${backups.isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button size="sm" onClick={runNow} disabled={running}>
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            {running ? "Gerando..." : "Rodar agora"}
          </Button>
        </div>
      </div>

      {backups.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-16 bg-slate-50/50 rounded-3xl border-2 border-dashed">
          <HardDrive className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-500">Nenhum backup ainda.</p>
          <p className="text-xs text-slate-400 mt-1">Clique em "Rodar agora" para gerar o primeiro.</p>
        </div>
      ) : (
        <div className="bg-white border border-border rounded-3xl overflow-hidden divide-y divide-slate-100">
          {files.map((f) => (
            <div key={f.name} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
              <div className="min-w-0">
                <p className="font-bold text-slate-900 truncate">{f.name}</p>
                <p className="text-xs text-slate-400">
                  {f.created_at
                    ? `${formatDistanceToNow(new Date(f.created_at), { locale: ptBR, addSuffix: true })} · ${formatSize(f.metadata?.size)}`
                    : formatSize(f.metadata?.size)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => download(f.name)}
                disabled={downloadingName === f.name}
              >
                {downloadingName === f.name ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
