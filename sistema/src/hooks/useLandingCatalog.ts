import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { StoreProduct } from "@/lib/storeHelpers";
import { sizeLabel } from "@/lib/catalog";

export function useLandingCatalog(title: string) {
  const { data: products = [] } = useQuery({ queryKey: ["public-store-products-v2"], queryFn: async () => {
    const { data, error } = await supabase.rpc("get_public_store_products");
    if (error) throw error;
    return (data ?? []) as unknown as StoreProduct[];
  } });
  const matches = products.filter(p => sizeLabel(p.name) === sizeLabel(title) && /face/i.test(p.name) === /face/i.test(title));
  return sizeLabel(title) !== "Inox" && matches.length === 1 ? matches[0] : undefined;
}
