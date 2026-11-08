// Botão + modal para gerar Contrato+OS e salvar em `contracts`.
// Os dados de instalação NÃO são cadastrados aqui: vêm de installation_schedule
// (fonte única). `service_order_data` guardado no contrato é apenas SNAPSHOT
// documental do momento da emissão — nunca reescrito depois.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, BUCKETS } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FullQuote } from "@/lib/cloudStore";
import { Button } from "@/components/ui/button";
import { FileSignature, Loader2, CheckCircle2, Download, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { reportError } from "@/lib/reportError";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { renderPdfBlob } from "@/lib/pdfLoader";
import { useQuoteInstallations } from "@/components/InstallationSection";
import {
  pickPrimarySchedule,
  scheduleToServiceOrderData,
  INSTALLATION_STATUS_LABELS,
  ScheduleRow,
} from "@/lib/installationSchedule";

type Props = {
  quote: FullQuote;
  logoUrl?: string;
  signatureUrl?: string;
};

export function ContractSection({ quote, logoUrl, signatureUrl }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const installations = useQuoteInstallations(quote.id, !!user);
  const primary = pickPrimarySchedule((installations.data ?? []) as ScheduleRow[]);

  const contracts = useQuery({
    queryKey: ["contracts", quote.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("quote_id", quote.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const generate = async () => {
    if (!user || generating) return;
    setGenerating(true);
    try {
      // Snapshot do agendamento vigente no instante da emissão.
      const serviceOrder = scheduleToServiceOrderData(primary, quote);

      // Numeração simples: CTR-{ano}-{seq}
      const year = new Date().getFullYear();
      const { count } = await supabase
        .from("contracts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", `${year}-01-01`);
      const contractNumber = `CTR-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;

      // Gera PDF
      const { ContractPDF } = await import("./ContractPDF");
      const blob = await renderPdfBlob(
        <ContractPDF
          quote={quote}
          logoUrl={logoUrl}
          signatureUrl={signatureUrl}
          contractNumber={contractNumber}
          serviceOrder={serviceOrder}
        />,
      );

      // Upload
      const path = `contracts/${user.id}/${contractNumber}.pdf`;
      const { error: upErr } = await supabase.storage
        .from(BUCKETS.businessAssets)
        .upload(path, blob, { contentType: "application/pdf", upsert: true });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(BUCKETS.businessAssets).getPublicUrl(path);

      const { error: insErr } = await supabase.from("contracts").insert({
        user_id: user.id,
        quote_id: quote.id,
        contract_number: contractNumber,
        pdf_url: pub.publicUrl,
        status: "enviado",
        service_order_data: { ...serviceOrder, installation_schedule_id: primary?.id ?? null } as any,
        terms_snapshot: { generated_at: new Date().toISOString() },
      });
      if (insErr) throw insErr;

      // Download local também
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${contractNumber}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      toast.success(`Contrato ${contractNumber} gerado`);
      await qc.invalidateQueries({ queryKey: ["contracts", quote.id] });
    } catch (e) {
      reportError(e, { scope: "contract/generate" });
    } finally {
      setGenerating(false);
    }
  };

  if (quote.status !== "aprovado") return null;


  return (
    <div className="space-y-3">
      <div className="bg-slate-50 rounded-2xl px-4 py-3 text-xs font-bold text-slate-500 flex items-start gap-2">
        <CalendarClock className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
        {primary ? (
          <span>
            A O.S. usará o agendamento vigente:{" "}
            <strong className="text-slate-700">
              {format(new Date(primary.scheduled_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
              {primary.scheduled_time && ` · ${String(primary.scheduled_time).slice(0, 5)}`}
            </strong>
            {primary.installer_name ? ` · ${primary.installer_name}` : ""} ·{" "}
            {INSTALLATION_STATUS_LABELS[primary.status ?? "agendado"] ?? primary.status}
          </span>
        ) : (
          <span>Sem instalação agendada — a O.S. sairá com “A combinar”. Agende abaixo se necessário.</span>
        )}
      </div>

      <Button
        onClick={generate}
        disabled={generating}
        className="w-full h-15 py-7 rounded-2xl gap-4 font-black bg-slate-900 hover:bg-slate-800 text-white"
      >
        {generating ? <><Loader2 className="w-5 h-5 animate-spin" />Gerando...</> : <><FileSignature className="w-6 h-6" />Gerar Contrato + OS</>}
      </Button>

      {contracts.data && contracts.data.length > 0 && (
        <div className="bg-slate-50 rounded-2xl p-3 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-2">
            Contratos deste orçamento
          </p>
          {contracts.data.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-slate-100">
              <div className="min-w-0">
                <p className="font-black text-sm truncate">{c.contract_number}</p>
                <p className="text-xs text-slate-400">
                  {c.status} · {format(new Date(c.created_at), "dd/MM/yyyy")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.signed_at && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                {c.pdf_url && (
                  <a href={c.pdf_url} target="_blank" rel="noreferrer">
                    <Button size="icon" variant="ghost" className="h-8 w-8">
                      <Download className="w-4 h-4" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

}
