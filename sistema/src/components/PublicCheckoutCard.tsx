import { useState } from "react";
import { CheckCircle2, CreditCard, Loader2, MapPin, PenTool, Truck, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatQuote";
import { reportError } from "@/lib/reportError";
import { sizeLabel } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/** Valor fixo da instalação em Fortaleza (o servidor aplica o mesmo valor). */
export const INSTALLATION_FEE = 100;

type CheckoutQuote = {
  id: string;
  client_view_token?: string | null;
  delivery_address?: string | null;
  installation_fee?: number | null;
  installation_required?: boolean | null;
  quote_items?: { product_name?: string | null }[] | null;
};

interface Props {
  quote: CheckoutQuote;
  total: number;
  onUpdated: () => Promise<void> | void;
  onPayNow: () => Promise<void> | void;
  onPayOnDelivery: () => void;
}

/**
 * Bloco de fechamento no topo da página do orçamento: endereço (quando falta),
 * instalação opcional e pagamento pela InfinityPay (Pix ou cartão).
 */
export function PublicCheckoutCard({ quote, total, onUpdated, onPayNow, onPayOnDelivery }: Props) {
  const hasAddress = !!quote.delivery_address?.trim();
  const [editing, setEditing] = useState(!hasAddress);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [addr, setAddr] = useState({ cep: "", street: "", number: "", neighborhood: "", city: "Fortaleza", complement: "" });
  const installationFee = Number(quote.installation_fee || 0);
  const installationOn = installationFee > 0;
  // Valor de instalação personalizado pela equipe: não oferece o liga/desliga.
  const installationEditable = installationFee === 0 || installationFee === INSTALLATION_FEE;
  const only15 = (quote.quote_items ?? []).every(i => sizeLabel(i.product_name) === "15 cm");

  const call = async (args: Record<string, unknown>) => {
    const { data, error } = await supabase.rpc("update_public_quote_checkout" as never, {
      p_quote_id: quote.id,
      p_token: quote.client_view_token ?? "",
      ...args,
    } as never);
    if (error) throw error;
    const res = data as { ok?: boolean; reason?: string } | null;
    if (!res?.ok) throw new Error(res?.reason || "update_failed");
  };

  const lookupCep = async (value: string) => {
    const cep = value.replace(/\D/g, "").slice(0, 8);
    setAddr(a => ({ ...a, cep }));
    if (cep.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await r.json();
      if (!d.erro) setAddr(a => ({ ...a, street: d.logradouro || a.street, neighborhood: d.bairro || a.neighborhood, city: d.localidade || a.city }));
    } catch { /* o cliente preenche à mão */ }
  };

  const saveAddress = async () => {
    if (!addr.street.trim() || !addr.number.trim()) {
      toast.error("Informe a rua e o número.");
      return false;
    }
    setSaving(true);
    try {
      await call({ p_cep: addr.cep, p_street: addr.street, p_number: addr.number, p_neighborhood: addr.neighborhood, p_city: addr.city, p_complement: addr.complement });
      await onUpdated();
      setEditing(false);
      return true;
    } catch (e) {
      reportError(e, { scope: "public-checkout/address", fallbackMessage: "Não conseguimos salvar o endereço. Tente de novo." });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleInstallation = async () => {
    setSaving(true);
    try {
      await call({ p_installation: !installationOn });
      await onUpdated();
    } catch (e) {
      reportError(e, { scope: "public-checkout/installation", fallbackMessage: "Não conseguimos atualizar a instalação." });
    } finally {
      setSaving(false);
    }
  };

  const ensureAddress = async () => (editing ? saveAddress() : true);

  const payNow = async () => {
    if (!(await ensureAddress())) return;
    setPaying(true);
    try { await onPayNow(); } finally { setPaying(false); }
  };

  const payOnDelivery = async () => {
    if (!(await ensureAddress())) return;
    onPayOnDelivery();
  };

  return (
    <section aria-label="Finalizar pedido" className="mb-10 rounded-2xl border-2 border-slate-900 bg-white overflow-hidden">
      <div className="bg-slate-900 text-white px-5 py-4 flex items-baseline justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Total</span>
        <span className="text-3xl font-extrabold font-mono tracking-tight">{formatCurrency(total)}</span>
      </div>

      <div className="p-5 space-y-5">
        {/* Entrega */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Onde entregamos</p>
          {editing ? (
            <div className="grid grid-cols-6 gap-2">
              <Input aria-label="CEP" inputMode="numeric" autoComplete="postal-code" placeholder="CEP" className="col-span-2 h-12" value={addr.cep} onChange={e => lookupCep(e.target.value)} />
              <Input aria-label="Rua" autoComplete="address-line1" placeholder="Rua" className="col-span-4 h-12" value={addr.street} onChange={e => setAddr(a => ({ ...a, street: e.target.value }))} />
              <Input aria-label="Número" inputMode="numeric" placeholder="Nº" className="col-span-2 h-12" value={addr.number} onChange={e => setAddr(a => ({ ...a, number: e.target.value }))} />
              <Input aria-label="Bairro" placeholder="Bairro" className="col-span-4 h-12" value={addr.neighborhood} onChange={e => setAddr(a => ({ ...a, neighborhood: e.target.value }))} />
              <Input aria-label="Complemento" placeholder="Complemento (opcional)" className="col-span-6 h-12" value={addr.complement} onChange={e => setAddr(a => ({ ...a, complement: e.target.value }))} />
              {hasAddress && (
                <button type="button" onClick={() => setEditing(false)} className="col-span-6 text-left text-xs font-bold text-slate-500 underline">Manter o endereço anterior</button>
              )}
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 border border-slate-100 p-3">
              <p className="text-sm font-semibold text-slate-800">{quote.delivery_address}</p>
              <button type="button" onClick={() => setEditing(true)} className="shrink-0 text-xs font-bold text-slate-500 underline">Alterar</button>
            </div>
          )}
          <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" />
            Pagando agora: entrega grátis em Fortaleza{only15 ? " · pronto em 24h" : ""}
          </p>
        </div>

        {/* Instalação */}
        {installationEditable && (
          <button
            type="button"
            role="switch"
            aria-checked={installationOn}
            disabled={saving}
            onClick={toggleInstallation}
            className={cn(
              "w-full flex items-center justify-between gap-3 rounded-lg border-2 p-3 text-left transition-colors",
              installationOn ? "border-green-600 bg-green-50" : "border-slate-200 hover:border-slate-400",
            )}
          >
            <span className="flex items-center gap-3">
              <Wrench className="w-5 h-5 text-slate-500" />
              <span>
                <span className="block font-bold text-slate-900 text-sm">Quero instalação</span>
                <span className="block text-xs text-slate-500">Instalamos na sua fachada em Fortaleza</span>
              </span>
            </span>
            <span className="flex items-center gap-2 font-bold text-sm text-slate-900">
              + {formatCurrency(INSTALLATION_FEE)}
              {installationOn ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <span className="w-5 h-5 rounded-full border-2 border-slate-300" />}
            </span>
          </button>
        )}

        {/* Pagamento */}
        <div className="space-y-2">
          <Button
            onClick={payNow}
            disabled={paying || saving}
            className="w-full h-14 rounded-lg font-bold gap-2 bg-green-600 hover:bg-green-500 text-white shadow-lg text-base"
          >
            {paying || saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
            Pagar agora · Pix ou cartão
          </Button>
          <p className="text-[11px] text-center text-slate-500">Pix ou cartão em até 3x sem juros · pagamento seguro InfinityPay</p>
          {only15 && <button
            type="button"
            onClick={payOnDelivery}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 pt-1 text-xs font-bold text-slate-500 hover:text-slate-900"
          >
            <PenTool className="w-3.5 h-3.5" /> Prefiro pagar na entrega (frete calculado pelo endereço)
          </button>}
          {!only15 && <p className="text-[11px] text-center text-slate-500">20 e 30 cm são feitos sob encomenda: pagamento no pedido, pronto em 7 dias úteis.</p>}
        </div>
      </div>
    </section>
  );
}
