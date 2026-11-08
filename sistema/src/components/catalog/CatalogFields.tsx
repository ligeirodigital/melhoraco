import { useState } from "react";
import { supabase, BUCKETS } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { reportError } from "@/lib/reportError";
import { ProductImage } from "./ProductImage";
import { Loader2 } from "lucide-react";

export type CatalogFieldsValue = { compare_at_price: number | null; made_to_order: boolean; lead_time_days: number | null; image_url: string | null };
export const emptyCatalogFields: CatalogFieldsValue = { compare_at_price: null, made_to_order: false, lead_time_days: null, image_url: null };

export function CatalogFields({ value, onChange, name }: { value: CatalogFieldsValue; onChange: (value: CatalogFieldsValue) => void; name: string }) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const upload = async (file?: File) => {
    if (!file || !user) return;
    setUploading(true);
    try {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Escolha uma foto JPG, PNG ou WebP.");
      if (file.size > 10 * 1024 * 1024) throw new Error("Escolha uma foto de até 10 MB.");
      const path = `${user.id}/products/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
      const { error } = await supabase.storage.from(BUCKETS.businessAssets).upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from(BUCKETS.businessAssets).getPublicUrl(path);
      onChange({ ...value, image_url: data.publicUrl });
    } catch (error) { reportError(error, { scope: "catalog-photo" }); }
    finally { setUploading(false); }
  };
  return <div className="space-y-4">
    <Label className="block space-y-2"><span>Preço anterior (R$)</span>
      <Input type="number" min="0" step="0.01" inputMode="decimal" value={value.compare_at_price ?? ""} onChange={e => onChange({ ...value, compare_at_price: e.target.value === "" ? null : Number(e.target.value) })} />
    </Label>
    <Label className="flex items-center justify-between gap-2"><span>Sob encomenda</span><Switch checked={value.made_to_order} onCheckedChange={checked => onChange({ ...value, made_to_order: checked })} /></Label>
    <Label className="block space-y-2"><span>Prazo de produção (dias)</span>
      <Input type="number" min="1" step="1" inputMode="numeric" value={value.lead_time_days ?? ""} onChange={e => onChange({ ...value, lead_time_days: e.target.value === "" ? null : Number(e.target.value) })} />
    </Label>
    <ProductImage src={value.image_url} name={name} className="w-24 h-24 rounded-md" />
    <Label className="block space-y-2"><span>Foto do produto</span>
      <Input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={e => void upload(e.target.files?.[0])} />
    </Label>
    {uploading && <Loader2 aria-label="Enviando foto" className="w-5 h-5 animate-spin" />}
  </div>;
}
