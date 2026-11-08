import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Plus } from "lucide-react";

interface Variant {
  id: string;
  name: string;
  stock_quantity?: number | null;
  price_adjustment?: number | null;
}

interface Props {
  variants: Variant[];
  onAdd: (variant: Variant) => void;
  madeToOrder?: boolean;
}

// Aceita dígitos e letras (ex.: 151A). Sem espaços/símbolos.
const FORMAT_RE = /^[0-9a-zA-Z]+$/;

export function NumberingQuickEntry({ variants, onAdd, madeToOrder = false }: Props) {
  const [value, setValue] = useState("");

  const trimmed = value.replace(/\s+/g, "");
  const formatError = trimmed.length > 0 && !FORMAT_RE.test(trimmed)
    ? "Use apenas números e letras (ex.: 151A)."
    : null;

  const breakdown = useMemo(() => {
    if (!trimmed || formatError) return [];
    const findVariant = (ch: string) => {
      const c = ch.toLowerCase();
      // 1. exact match
      let v = variants.find((x) => (x.name ?? "").trim().toLowerCase() === c);
      if (v) return v;
      // 2. extract alphanumeric tokens from name and match any
      v = variants.find((x) => {
        const tokens: string[] = (x.name ?? "").toLowerCase().match(/[0-9a-z]+/g) ?? [];
        return tokens.includes(c);
      });
      if (v) return v;
      // 3. contains the char as standalone digit/letter
      v = variants.find((x) => new RegExp(`(^|[^0-9a-z])${c}([^0-9a-z]|$)`, "i").test(x.name ?? ""));
      return v;
    };
    return trimmed.split("").map((ch) => {
      const variant = findVariant(ch);
      const stock = variant?.stock_quantity ?? 0;
      return { ch, variant, stock };
    });
  }, [trimmed, formatError, variants]);

  // Considera quantas vezes cada char aparece para validar estoque acumulado
  const usage = useMemo(() => {
    const map = new Map<string, number>();
    breakdown.forEach((b, idx) => {
      const key = b.ch.toLowerCase();
      const used = (map.get(key) ?? 0) + 1;
      map.set(key, used);
      (b as any).used = used;
      (b as any).insufficient = b.variant ? !madeToOrder && used > b.stock : false;
      (b as any).index = idx;
    });
    return map;
  }, [breakdown, madeToOrder]);

  const missing = breakdown.filter((b) => !b.variant).map((b) => b.ch);
  const insufficient = breakdown.filter((b: any) => b.variant && b.insufficient);
  const canAdd = breakdown.length > 0 && !formatError && missing.length === 0 && insufficient.length === 0;

  const handleAdd = () => {
    if (!canAdd) return;
    breakdown.forEach((b) => b.variant && onAdd(b.variant));
    setValue("");
  };

  return (
    <div className="pl-4 space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder='Numeração (ex: "151A")'
          aria-invalid={!!formatError}
          className="flex-1 p-2.5 rounded-xl bg-primary/5 border-2 border-primary/20 text-xs font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="px-3 rounded-xl bg-primary text-white text-[11px] font-black uppercase tracking-wider disabled:bg-slate-200 disabled:text-slate-400 transition-all flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>

      {formatError && (
        <p className="text-[10px] font-bold text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {formatError}
        </p>
      )}

      {breakdown.length > 0 && !formatError && (
        <div className="space-y-1.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            Disponibilidade
          </p>
          <div className="flex flex-wrap gap-1.5">
            {breakdown.map((b: any, i) => {
              const ok = b.variant && !b.insufficient;
              return (
                <div
                  key={i}
                  title={
                    !b.variant
                      ? `Sem variação "${b.ch}"`
                      : b.insufficient
                      ? `Estoque insuficiente (${b.stock} un, precisa ${b.used})`
                      : madeToOrder ? "Feito sob encomenda" : `${b.stock} un em estoque`
                  }
                  className={
                    "px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 border " +
                    (!b.variant
                      ? "bg-red-50 border-red-200 text-red-600"
                      : b.insufficient
                      ? "bg-amber-50 border-amber-200 text-amber-700"
                      : "bg-emerald-50 border-emerald-200 text-emerald-700")
                  }
                >
                  <span className="uppercase">{b.ch}</span>
                  <span className="opacity-70">
                    {b.variant ? madeToOrder ? "· Encomenda" : `· ${b.stock}` : "· ?"}
                  </span>
                  {ok && <CheckCircle2 className="w-3 h-3" />}
                  {!b.variant && <AlertCircle className="w-3 h-3" />}
                </div>
              );
            })}
          </div>

          {missing.length > 0 && (
            <p className="text-[10px] font-bold text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Sem variação para: {missing.join(", ")}
            </p>
          )}
          {insufficient.length > 0 && (
            <p className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Estoque insuficiente para:{" "}
              {insufficient.map((b: any) => `${b.ch} (${b.stock})`).join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
