import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { CatalogFields, type CatalogFieldsValue } from "./CatalogFields";
import { ProductImage } from "./ProductImage";
import { CatalogPrice } from "./CatalogPrice";
import type { Tables } from "@/integrations/supabase/types";
import { reportError } from "@/lib/reportError";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

type Product = Tables<"products">;
export function CatalogManager() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [category, setCategory] = useState("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const { data: products = [] } = useQuery({ queryKey: ["catalog-admin", user?.id], enabled: !!user, queryFn: async () => {
    const { data, error } = await supabase.from("products").select("*").order("sort_order");
    if (error) throw error;
    return data;
  } });
  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("products").update({ compare_at_price: editing.compare_at_price, made_to_order: editing.made_to_order, lead_time_days: editing.lead_time_days, image_url: editing.image_url, category: editing.category, name: editing.name }).eq("id", editing.id);
      if (error) throw error;
      await Promise.all([client.invalidateQueries({ queryKey: ["catalog-admin"] }), client.invalidateQueries({ queryKey: ["products"] }), client.invalidateQueries({ queryKey: ["public-store-products-v2"] }), client.invalidateQueries({ queryKey: ["public-store-product"] }), client.invalidateQueries({ queryKey: ["quotes"] })]);
      setEditing(null); toast.success("Produto atualizado");
    } catch (error) { reportError(error, { scope: "catalog-save" }); }
    finally { setSaving(false); }
  };
  return <section className="space-y-4">
    <div className="flex items-center justify-between gap-3 flex-wrap"><h2 className="text-xl font-bold">Catálogo da loja</h2>
      <Select value={category} onValueChange={setCategory}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as categorias</SelectItem>{Array.from(new Set(products.map(p => p.category).filter((c): c is string => !!c))).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
    </div>
    <div className="grid sm:grid-cols-2 gap-3">{products.filter(p => category === "all" || p.category === category).map(p => <div key={p.id} className="border rounded-lg p-3 bg-card flex gap-3 min-w-0">
      <ProductImage name={p.name} src={p.image_url} className="w-16 h-16 shrink-0 rounded" /><div className="flex-1 min-w-0"><p className="font-semibold break-words">{p.name}</p><p className="text-xs text-muted-foreground">{p.category}{p.hidden ? " · Oculto" : ""}</p><CatalogPrice product={p} price={p.price} /><Button size="sm" variant="outline" className="mt-2" onClick={() => setEditing(p)}><Pencil className="w-3 h-3 mr-1" /> Editar produto</Button></div>
    </div>)}</div>
    <Dialog open={!!editing} onOpenChange={open => { if (!open) setEditing(null); }}><DialogContent><DialogHeader><DialogTitle>Editar produto</DialogTitle></DialogHeader>{editing && <div className="space-y-4">
      <label className="block space-y-1">Nome<Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></label>
      <label className="block space-y-1">Categoria<Input value={editing.category ?? ""} onChange={e => setEditing({ ...editing, category: e.target.value })} /></label>
      <CatalogFields name={editing.name} value={{ compare_at_price: editing.compare_at_price, made_to_order: editing.made_to_order, lead_time_days: editing.lead_time_days, image_url: editing.image_url }} onChange={(fields: CatalogFieldsValue) => setEditing({ ...editing, ...fields })} />
      <Button className="w-full" disabled={saving || !editing.name.trim()} onClick={save}>Salvar produto</Button>
    </div>}</DialogContent></Dialog>
  </section>;
}
