import { CatalogPrice } from "@/components/catalog/CatalogPrice";
import { ProductImage } from "@/components/catalog/ProductImage";
import { isSoldOut, priceUnit } from "@/lib/catalog";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Heart, Loader2, Minus, Plus, ShoppingCart, Star, Truck, ShieldCheck, Share2,
} from "lucide-react";
import { toast } from "sonner";
import {
  StoreProductDetail, StoreVariant, brl, extractDimensions,
  getFavorites, toggleFavorite, cartItemKey,
} from "@/lib/storeHelpers";

const CART_KEY = "melhoraco_cart";

function readCart(): any[] {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { return []; }
}
function writeCart(items: any[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("cart-changed"));
}

export default function StoreProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [variant, setVariant] = useState<StoreVariant | null>(null);
  const [fav, setFav] = useState<string[]>([]);

  useEffect(() => { setFav(getFavorites()); }, []);

  const { data: product, isLoading } = useQuery({
    queryKey: ["public-store-product", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_store_product", { p_id: id as string });
      if (error) throw error;
      return data as unknown as StoreProductDetail | null;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (product) {
      document.title = `${product.name} — Loja Melhoraço`;
      if (product.variants?.length && !variant) setVariant(product.variants[0]);
    }
  }, [product, variant]);

  const unitPrice = useMemo(() => {
    if (!product) return 0;
    return product.price + (variant?.price_adjustment ?? 0);
  }, [product, variant]);

  const outOfStock = useMemo(() => {
    if (!product) return false;
    return isSoldOut(product, variant);
  }, [product, variant]);

  const dimensions = product ? extractDimensions(product.description) : null;
  const isFav = product ? fav.includes(product.id) : false;

  const addToCart = () => {
    if (!product || outOfStock) return;
    const items = readCart();
    const key = cartItemKey({ product, variant, quantity: qty });
    const existing = items.find((i: any) => `${i.product.id}:${i.variant?.id ?? "_"}` === key);
    if (existing) existing.quantity += qty;
    else items.push({ product, variant, quantity: qty });
    writeCart(items);
    toast.success(`${qty}x ${product.name} adicionado ao carrinho`);
  };

  const buyNow = () => {
    addToCart();
    navigate("/loja?open=cart");
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: product?.name, url }); return; } catch { /* fallthrough */ }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background p-4">
        <p className="text-lg font-semibold">Produto indisponível</p>
        <Button onClick={() => navigate("/loja")} className="bg-orange-500 hover:bg-orange-600">
          Voltar para a loja
        </Button>
      </div>
    );
  }

  const rating = product.rating_avg ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-[#0f172a] text-white border-b border-orange-500/40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 -ml-2"
            onClick={() => navigate("/loja")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Loja
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={share}>
            <Share2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10"
            onClick={() => { toggleFavorite(product.id); setFav(getFavorites()); }}>
            <Heart className={`w-4 h-4 ${isFav ? "fill-orange-500 text-orange-500" : ""}`} />
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 gap-6 md:gap-10">
          <div className="rounded-2xl overflow-hidden bg-muted aspect-square flex items-center justify-center">
            <ProductImage src={product.image_url} name={product.name} className="w-full h-full" />
          </div>

          <div className="flex flex-col">
            {product.category && (
              <Badge variant="secondary" className="w-fit mb-2">{product.category}</Badge>
            )}
            <h1 className="text-2xl md:text-3xl font-bold leading-tight">{product.name}</h1>

            {(product.rating_count ?? 0) > 0 && (
              <div className="flex items-center gap-1 mt-2">
                {[1,2,3,4,5].map((n) => (
                  <Star key={n} className={`w-4 h-4 ${n <= Math.round(rating) ? "fill-orange-500 text-orange-500" : "text-muted-foreground"}`} />
                ))}
                <span className="text-sm text-muted-foreground ml-1">
                  {rating.toFixed(1)} · {product.rating_count} avaliações
                </span>
              </div>
            )}

            <div className="mt-4 flex items-baseline gap-2">
              <CatalogPrice product={product} price={unitPrice} previous={product.compare_at_price == null ? null : product.compare_at_price + (variant?.price_adjustment ?? 0)} />
              <span className="text-sm text-muted-foreground">ou em até 12x no cartão</span>
            </div>

            {product.variants.length > 0 && (
              <div className="mt-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Variação</p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => {
                    const active = v.id === variant?.id;
                    const disabled = isSoldOut(product, v);
                    return (
                      <Button
                        variant="outline"
                        key={v.id}
                        disabled={disabled}
                        onClick={() => setVariant(v)}
                        className={`px-3 py-2 rounded-lg border text-sm transition ${
                          active
                            ? "border-orange-500 bg-orange-500/10 text-orange-700 font-semibold"
                            : "border-border hover:border-orange-400"
                        } ${disabled ? "opacity-40 line-through cursor-not-allowed" : ""}`}
                      >
                        {v.name}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {dimensions && (
              <div className="mt-4 p-3 rounded-lg bg-muted/40 border">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Dimensões</p>
                <p className="font-medium">{dimensions}</p>
              </div>
            )}

            <div className="mt-6 flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Quantidade</span>
              <div className="flex items-center border rounded-lg">
                <Button size="icon" variant="ghost" className="h-9 w-9"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-8 text-center font-semibold">{qty}</span>
                <Button size="icon" variant="ghost" className="h-9 w-9"
                  onClick={() => setQty((q) => q + 1)}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button size="lg" variant="outline" disabled={outOfStock} onClick={addToCart}>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600" disabled={outOfStock} onClick={buyNow}>
                {outOfStock ? "Indisponível" : "Comprar agora"}
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2 p-3 rounded-lg border bg-card">
                <Truck className="w-4 h-4 text-orange-500 mt-0.5" />
                <div>
                  <p className="font-medium">Frete calculado no checkout</p>
                  <p className="text-xs text-muted-foreground">Entrega para todo o Brasil</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg border bg-card">
                <ShieldCheck className="w-4 h-4 text-orange-500 mt-0.5" />
                <div>
                  <p className="font-medium">Pagamento seguro</p>
                  <p className="text-xs text-muted-foreground">Pix, cartão e boleto via InfinityPay</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {product.description && (
          <>
            <Separator className="my-10" />
            <section>
              <h2 className="text-xl font-bold mb-3">Sobre o produto</h2>
              <p className="whitespace-pre-line text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            </section>
          </>
        )}

        {product.reviews.length > 0 && (
          <>
            <Separator className="my-10" />
            <section>
              <h2 className="text-xl font-bold mb-4">Avaliações de clientes</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {product.reviews.slice(0, 6).map((r, i) => (
                  <div key={i} className="p-4 rounded-xl border bg-card">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{r.client_name}</p>
                      <div className="flex">
                        {[1,2,3,4,5].map((n) => (
                          <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? "fill-orange-500 text-orange-500" : "text-muted-foreground/40"}`} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{r.comment}</p>}
                    {r.photo && (
                      <img src={r.photo} alt="foto do cliente"
                        className="mt-3 rounded-lg w-full max-h-48 object-cover" />
                    )}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {product.related.length > 0 && (
          <>
            <Separator className="my-10" />
            <section>
              <h2 className="text-xl font-bold mb-4">Você também pode gostar</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {product.related.map((r) => (
                  <Link key={r.id} to={`/loja/produto/${r.id}`}
                    className="group border rounded-xl overflow-hidden bg-card hover:shadow-lg transition">
                    <div className="aspect-square bg-muted overflow-hidden">
                      <ProductImage src={r.image_url} name={r.name} className="w-full h-full" />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium line-clamp-2">{r.name}</p>
                      <p className="text-orange-600 font-bold mt-1">{brl(r.price)} {priceUnit(r.name)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
