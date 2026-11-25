import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { StoreProduct } from "@/lib/storeHelpers";
import { sizeLabel } from "@/lib/catalog";

const CATALOG_KEY = ["public-store-products-v2"] as const;

async function loadCatalog() {
  const { data, error } = await supabase.rpc("get_public_store_products");
  if (error) throw error;
  return (data ?? []) as unknown as StoreProduct[];
}

/** Produto do catálogo que corresponde ao título da LP (tamanho + "só face"). */
export function matchLandingProduct(products: StoreProduct[], title: string) {
  const matches = products.filter(p => sizeLabel(p.name) === sizeLabel(title) && /face/i.test(p.name) === /face/i.test(title));
  return sizeLabel(title) !== "Inox" && matches.length === 1 ? matches[0] : undefined;
}

/** Busca o produto na hora, para quando a LP precisa dele antes do hook carregar. */
export async function fetchLandingProduct(title: string) {
  return matchLandingProduct(await loadCatalog(), title);
}

export function useLandingCatalog(title: string) {
  const { data: products = [] } = useQuery({ queryKey: CATALOG_KEY, queryFn: loadCatalog });
  return matchLandingProduct(products, title);
}
