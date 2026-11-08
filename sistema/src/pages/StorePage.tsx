import { CatalogPrice } from "@/components/catalog/CatalogPrice";
import { ProductImage } from "@/components/catalog/ProductImage";
import { isSoldOut, priceUnit } from "@/lib/catalog";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase, FN_PREFIX } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart, Plus, Minus, Trash2, Search, Loader2, History, Heart,
  Star, Truck, ShieldCheck, Sparkles, Tag, Flame, X,
} from "lucide-react";
import { toast } from "sonner";
import { getAttribution } from "@/lib/attribution";
import { trackMetaEvent } from "@/lib/metaPixel";
import OrderConfirmationDialog from "@/components/store/OrderConfirmationDialog";
import {
  StoreProduct, CartItem, brl, buildOrderWhatsAppText, cartItemPrice, cartItemKey,
  getFavorites, toggleFavorite, quoteShipping, ShippingQuote,
} from "@/lib/storeHelpers";

const CART_KEY = "melhoraco_cart";

function readCart(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { return []; }
}
function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("cart-changed"));
}

type Sort = "featured" | "newest" | "price_asc" | "price_desc" | "rating";

export default function StorePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("todas");
  const [sort, setSort] = useState<Sort>("featured");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [favs, setFavs] = useState<string[]>([]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<{ text: string; paymentUrl: string } | null>(null);

  // Coupon + shipping
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount_pct: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [shipping, setShipping] = useState<ShippingQuote | null>(null);

  const [form, setForm] = useState({
    name: "", phone: "", cep: "", address: "", address_number: "", address_complement: "", notes: "",
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["public-store-products-v2"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_store_products");
      if (error) throw error;
      return ((data as unknown) || []) as StoreProduct[];
    },
  });

  useEffect(() => {
    document.title = "Loja Melhoraço — E-commerce oficial";
    setCart(readCart());
    setFavs(getFavorites());
    const savedPhone = localStorage.getItem("melhoraco_customer_phone");
    if (savedPhone) setForm((f) => ({ ...f, phone: savedPhone }));
    const onCart = () => setCart(readCart());
    const onFav = () => setFavs(getFavorites());
    window.addEventListener("cart-changed", onCart);
    window.addEventListener("favorites-changed", onFav);
    return () => {
      window.removeEventListener("cart-changed", onCart);
      window.removeEventListener("favorites-changed", onFav);
    };
  }, []);

  useEffect(() => {
    if (params.get("open") === "cart") {
      setCartOpen(true);
      params.delete("open");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const maxPrice = useMemo(
    () => Math.max(100, ...products.map((p) => Math.ceil(p.price))),
    [products]
  );
  useEffect(() => {
    setPriceRange((r) => [0, Math.max(r[1], maxPrice)]);
  }, [maxPrice]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return ["todas", ...Array.from(set)];
  }, [products]);

  const featured = useMemo(
    () =>
      [...products]
        .sort((a, b) => (b.sales_count ?? 0) - (a.sales_count ?? 0))
        .slice(0, 4),
    [products]
  );

  const newest = useMemo(
    () =>
      [...products]
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        .slice(0, 4),
    [products]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = products.filter((p) => {
      if (category !== "todas" && p.category !== category) return false;
      if (onlyFavs && !favs.includes(p.id)) return false;
      if (p.price < priceRange[0] || p.price > priceRange[1]) return false;
      if (q && !p.name.toLowerCase().includes(q) && !(p.description || "").toLowerCase().includes(q)) return false;
      return true;
    });
    switch (sort) {
      case "newest":
        list = list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
      case "price_asc": list = list.sort((a, b) => a.price - b.price); break;
      case "price_desc": list = list.sort((a, b) => b.price - a.price); break;
      case "rating": list = list.sort((a, b) => (b.rating_avg ?? 0) - (a.rating_avg ?? 0)); break;
      default:
        list = list.sort((a, b) =>
          (a.sort_order ?? 999) - (b.sort_order ?? 999) ||
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }
    return list;
  }, [products, search, category, onlyFavs, favs, priceRange, sort]);

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const subtotal = cart.reduce((s, i) => s + cartItemPrice(i), 0);
  const discount = coupon ? (subtotal * coupon.discount_pct) / 100 : 0;
  const shippingFee = shipping?.fee ?? 0;
  const totalPrice = Math.max(0, subtotal - discount) + shippingFee;

  // ---------- Cart ops ----------
  const addToCart = (p: StoreProduct, qty = 1) => {
    if (p.has_variants) { navigate(`/loja/produto/${p.id}`); return; }
    const items = readCart();
    const key = cartItemKey({ product: p, variant: null, quantity: qty });
    const found = items.find((i) => cartItemKey(i) === key);
    if (found) found.quantity += qty;
    else items.push({ product: p, variant: null, quantity: qty });
    writeCart(items);
    setCart(items);
    toast.success(`${p.name} adicionado`);
  };
  const updateQty = (key: string, delta: number) => {
    const items = readCart()
      .map((i) => (cartItemKey(i) === key ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
      .filter((i) => i.quantity > 0);
    writeCart(items); setCart(items);
  };
  const removeItem = (key: string) => {
    const items = readCart().filter((i) => cartItemKey(i) !== key);
    writeCart(items); setCart(items);
  };

  // ---------- Coupon ----------
  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponLoading(true);
    const { data, error } = await supabase.rpc("validate_referral_code", { p_code: code });
    setCouponLoading(false);
    const res = data as any;
    if (error || !res?.valid) {
      toast.error("Cupom inválido ou expirado");
      setCoupon(null);
      return;
    }
    setCoupon({ code: res.code, discount_pct: Number(res.discount_pct) || 0 });
    toast.success(`Cupom aplicado! -${res.discount_pct}%`);
  };
  const removeCoupon = () => { setCoupon(null); setCouponInput(""); };

  // ---------- Shipping ----------
  useEffect(() => {
    const q = quoteShipping(form.cep);
    setShipping(q);
  }, [form.cep]);

  // ---------- Checkout ----------
  const handleCheckout = async () => {
    if (!form.name.trim() || form.name.trim().length < 3) return toast.error("Informe seu nome completo");
    const phoneDigits = form.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) return toast.error("Telefone inválido");
    if (cart.length === 0) return toast.error("Carrinho vazio");
    if (!shipping) return toast.error("Informe um CEP válido para calcular o frete");

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("create_public_order", {
        payload: {
          customer: form,
          attribution: getAttribution(),
          items: cart.map((i) => ({
            product_id: i.product.id,
            variant_id: i.variant?.id ?? null,
            quantity: i.quantity,
          })),
          coupon_code: coupon?.code ?? null,
          shipping_fee: shippingFee,
        } as any,
      });
      if (error) throw error;
      const res = data as any;
      if (!res?.ok) throw new Error(res?.reason || "Erro ao criar pedido");

      trackMetaEvent("InitiateCheckout", { value: totalPrice, currency: "BRL", num_items: cart.reduce((sum, item) => sum + item.quantity, 0) });
      const { data: pay, error: payErr } = await supabase.functions.invoke(`${FN_PREFIX}infinitypay-create-link`, {
        body: { quoteId: res.quote_id, redirectUrl: `${window.location.origin}/pedido/${res.quote_id}/sucesso` },
      });
      if (payErr) throw payErr;
      if (!pay?.url) throw new Error("Link de pagamento indisponível");

      localStorage.setItem("melhoraco_customer_phone", phoneDigits);
      localStorage.setItem("melhoraco_last_order", JSON.stringify({
        id: res.quote_id, token: res.token, paymentUrl: pay.url,
      }));

      const portalUrl = `${window.location.origin}/p/q_${res.quote_id}_${res.token}`;
      const waText = buildOrderWhatsAppText({
        clientName: form.name.trim(),
        items: cart, total: totalPrice,
        orderNsu: pay.order_nsu, portalUrl, paymentUrl: pay.url,
        shipping: shippingFee, discount,
      });

      setSubmitting(false);
      setCheckoutOpen(false);
      writeCart([]); setCart([]); removeCoupon();
      setConfirmation({ text: waText, paymentUrl: pay.url });
    } catch (e: any) {
      toast.error(e.message || "Erro ao finalizar pedido");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0f172a] text-white border-b border-orange-500/40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/loja" className="flex flex-col leading-tight">
            <h1 className="text-xl font-black tracking-tight">Melhoraço</h1>
            <p className="text-[10px] uppercase tracking-widest text-orange-300/80">E-commerce oficial</p>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hidden sm:inline-flex"
              onClick={() => setOnlyFavs((v) => !v)}>
              <Heart className={`w-4 h-4 mr-1 ${onlyFavs ? "fill-orange-500 text-orange-500" : ""}`} />
              Favoritos
            </Button>
            <Link to="/loja/meus-pedidos">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <History className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Meus pedidos</span>
              </Button>
            </Link>
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button variant="secondary" className="bg-orange-500 hover:bg-orange-600 text-white border-0 relative">
                  <ShoppingCart className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Carrinho</span>
                  {totalItems > 0 && (
                    <Badge className="absolute -top-2 -right-2 bg-white text-orange-600">{totalItems}</Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md flex flex-col">
                <SheetHeader><SheetTitle>Seu carrinho</SheetTitle></SheetHeader>
                <div className="flex-1 overflow-y-auto py-4 space-y-3">
                  {cart.length === 0 && (
                    <div className="text-center text-muted-foreground py-16">
                      <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      Seu carrinho está vazio
                    </div>
                  )}
                  {cart.map((i) => {
                    const key = cartItemKey(i);
                    return (
                      <div key={key} className="flex gap-3 border rounded-lg p-3">
                        <ProductImage src={i.product.image_url} name={i.product.name} className="w-16 h-16 shrink-0 rounded" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{i.product.name}</p>
                          {i.variant && <p className="text-xs text-orange-600">{i.variant.name}</p>}
                          <p className="text-xs text-muted-foreground">
                            {brl((i.product.price + (i.variant?.price_adjustment ?? 0)))} {priceUnit(i.product.name)}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(key, -1)}>
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="text-sm w-6 text-center">{i.quantity}</span>
                            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(key, 1)}>
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 ml-auto text-destructive" onClick={() => removeItem(key)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {cart.length > 0 && (
                  <div className="border-t pt-3 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{brl(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total estimado</span><span className="text-orange-600">{brl(subtotal)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Frete e cupons calculados no checkout.</p>
                    <Button className="w-full bg-orange-500 hover:bg-orange-600 h-11"
                      onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>
                      Ir para o checkout
                    </Button>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.25),transparent_55%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-20 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 text-orange-300 text-xs font-semibold px-3 py-1 mb-4">
              <Sparkles className="w-3 h-3" /> Novidades da semana
            </span>
            <h2 className="text-3xl md:text-5xl font-black leading-tight">
              Peça direto da fábrica, <br />
              com <span className="text-orange-400">preço industrial</span>.
            </h2>
            <p className="text-white/70 mt-4 max-w-md">
              Números de casa em inox de 15, 20 e 30 cm, vendidos por dígito.
              Pagamento seguro e acompanhamento em tempo real do seu pedido.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 h-12"
                onClick={() => document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" })}>
                <Flame className="w-4 h-4 mr-2" /> Ver catálogo
              </Button>
              <Link to="/loja/rastrear">
                <Button size="lg" variant="outline" className="h-12 bg-transparent border-white/30 hover:bg-white/10 text-white">
                  <Truck className="w-4 h-4 mr-2" /> Rastrear pedido
                </Button>
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4 text-xs">
              <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-orange-400" /> Pagamento seguro</div>
              <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-orange-400" /> Entrega Brasil</div>
              <div className="flex items-center gap-2"><Star className="w-4 h-4 text-orange-400" /> Avaliado por clientes</div>
            </div>
          </div>
          <div className="hidden md:grid grid-cols-2 gap-3">
            {featured.slice(0, 4).map((p) => (
              <Link key={p.id} to={`/loja/produto/${p.id}`}
                className="group relative aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                <ProductImage src={p.image_url} name={p.name} className="w-full h-full" />
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                  <p className="text-xs font-semibold truncate">{p.name}</p>
                  <p className="text-primary text-sm font-bold">{brl(p.price)} {priceUnit(p.name)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 2 && (
        <section className="max-w-6xl mx-auto px-4 py-8">
          <h3 className="text-lg font-bold mb-3">Categorias</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {categories.filter((c) => c !== "todas").map((c) => {
              const active = category === c;
              return (
                <button key={c} onClick={() => setCategory(active ? "todas" : c)}
                  className={`shrink-0 min-w-[130px] rounded-2xl border p-4 text-left transition ${
                    active ? "border-orange-500 bg-orange-500/10" : "border-border hover:border-orange-400"
                  }`}>
                  <Tag className="w-4 h-4 text-orange-500 mb-2" />
                  <p className="font-semibold text-sm">{c}</p>
                  <p className="text-xs text-muted-foreground">
                    {products.filter((p) => p.category === c).length} produtos
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured strip */}
      {featured.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold flex items-center gap-2"><Flame className="w-4 h-4 text-orange-500" /> Mais vendidos</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} favs={favs}
                onAdd={() => addToCart(p)} onFav={() => { toggleFavorite(p.id); setFavs(getFavorites()); }} />
            ))}
          </div>
        </section>
      )}

      {/* Filters + Catalog */}
      <section id="catalogo" className="max-w-6xl mx-auto px-4 py-8 scroll-mt-20">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar em toda a loja..." className="pl-9 h-11" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}
            className="h-11 rounded-md border bg-background px-3 text-sm">
            <option value="featured">Relevância</option>
            <option value="newest">Mais recentes</option>
            <option value="price_asc">Menor preço</option>
            <option value="price_desc">Maior preço</option>
            <option value="rating">Melhor avaliados</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex gap-2 overflow-x-auto flex-1">
            {categories.map((c) => (
              <Button key={c} size="sm" variant={c === category ? "default" : "outline"}
                className={c === category ? "bg-orange-500 hover:bg-orange-600" : ""}
                onClick={() => setCategory(c)}>{c}</Button>
            ))}
          </div>
          <div className="flex items-center gap-3 w-full sm:w-72">
            <span className="text-xs text-muted-foreground shrink-0">Preço</span>
            <Slider
              value={priceRange}
              min={0}
              max={maxPrice}
              step={10}
              onValueChange={(v) => setPriceRange([v[0], v[1]] as [number, number])}
            />
            <span className="text-xs font-medium shrink-0">
              {brl(priceRange[0])} - {brl(priceRange[1])}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">Nenhum produto encontrado</p>
            <Button variant="link" onClick={() => {
              setSearch(""); setCategory("todas"); setOnlyFavs(false); setPriceRange([0, maxPrice]);
            }}>Limpar filtros</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} favs={favs}
                onAdd={() => addToCart(p)} onFav={() => { toggleFavorite(p.id); setFavs(getFavorites()); }} />
            ))}
          </div>
        )}
      </section>

      {/* Newest */}
      {newest.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-orange-500" /> Novidades</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {newest.map((p) => (
              <ProductCard key={p.id} product={p} favs={favs}
                onAdd={() => addToCart(p)} onFav={() => { toggleFavorite(p.id); setFavs(getFavorites()); }} />
            ))}
          </div>
        </section>
      )}

      {/* Footer strip */}
      <footer className="bg-[#0f172a] text-white/80 mt-8">
        <div className="max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-3 gap-6 text-sm">
          <div>
            <p className="font-bold text-white mb-1">Melhoraço</p>
            <p className="text-xs">Portões, grades e serralheria de qualidade industrial.</p>
          </div>
          <div>
            <p className="font-bold text-white mb-2">Ajuda</p>
            <Link to="/loja/meus-pedidos" className="block text-xs hover:text-orange-300">Meus pedidos</Link>
            <Link to="/loja/rastrear" className="block text-xs hover:text-orange-300">Rastrear pedido</Link>
          </div>
          <div>
            <p className="font-bold text-white mb-2">Formas de pagamento</p>
            <p className="text-xs">Pix, cartão e boleto — processados por InfinityPay.</p>
          </div>
        </div>
      </footer>

      {/* Checkout dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Finalizar pedido</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Contact + address */}
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Contato</p>
              <Input autoComplete="name" placeholder="Nome completo *" maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="Telefone / WhatsApp *" maxLength={20} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Entrega</p>
              <Input inputMode="numeric" autoComplete="postal-code" placeholder="CEP *" maxLength={10} value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} />
              {shipping ? (
                <div className="p-3 rounded-lg border bg-muted/40 text-sm flex items-start gap-2">
                  <Truck className="w-4 h-4 text-orange-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">{shipping.label}</p>
                    <p className="text-xs text-muted-foreground">Prazo estimado: {shipping.days}</p>
                  </div>
                  <span className="font-bold text-orange-600">
                    {shipping.fee === 0 ? "Grátis" : brl(shipping.fee)}
                  </span>
                </div>
              ) : (
                form.cep.length > 0 && <p className="text-xs text-muted-foreground">Digite um CEP válido (8 dígitos) para calcular o frete.</p>
              )}
              <Input placeholder="Endereço" maxLength={150} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Número" maxLength={10} value={form.address_number} onChange={(e) => setForm({ ...form, address_number: e.target.value })} />
                <Input placeholder="Complemento" maxLength={60} value={form.address_complement} onChange={(e) => setForm({ ...form, address_complement: e.target.value })} />
              </div>
              <Textarea placeholder="Observações (opcional)" maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            {/* Coupon */}
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Cupom de desconto</p>
              {coupon ? (
                <div className="flex items-center justify-between p-3 rounded-lg border border-orange-400 bg-orange-500/10">
                  <div>
                    <p className="text-sm font-semibold text-orange-700">{coupon.code}</p>
                    <p className="text-xs text-muted-foreground">-{coupon.discount_pct}% aplicado</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={removeCoupon}><X className="w-4 h-4" /></Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input placeholder="Digite o cupom" value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())} />
                  <Button variant="outline" disabled={couponLoading} onClick={applyCoupon}>
                    {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{brl(subtotal)}</span></div>
              {discount > 0 && (
                <div className="flex justify-between text-orange-600"><span>Desconto</span><span>-{brl(discount)}</span></div>
              )}
              <div className="flex justify-between"><span>Frete</span>
                <span>{shipping ? (shippingFee === 0 ? "Grátis" : brl(shippingFee)) : "—"}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t mt-2">
                <span>Total</span><span className="text-orange-600">{brl(totalPrice)}</span>
              </div>
            </div>

            <Button className="w-full bg-orange-500 hover:bg-orange-600 h-11" disabled={submitting} onClick={handleCheckout}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processando...</> : "Confirmar e pagar"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Ao confirmar, você receberá o link de pagamento InfinityPay e a opção de envio por WhatsApp.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {confirmation && (
        <OrderConfirmationDialog
          open={!!confirmation}
          onOpenChange={(o) => !o && setConfirmation(null)}
          whatsappText={confirmation.text}
          paymentUrl={confirmation.paymentUrl}
        />
      )}
    </div>
  );
}

// ------------ Product card ------------
function ProductCard({
  product, favs, onAdd, onFav,
}: {
  product: StoreProduct;
  favs: string[];
  onAdd: () => void;
  onFav: () => void;
}) {
  const isFav = favs.includes(product.id);
  const rating = product.rating_avg ?? 0;
  const outOfStock = isSoldOut(product);
  return (
    <div className="group border rounded-2xl overflow-hidden bg-card flex flex-col hover:shadow-xl hover:-translate-y-0.5 transition">
      <Link to={`/loja/produto/${product.id}`} className="relative aspect-square bg-muted overflow-hidden block">
        <ProductImage src={product.image_url} name={product.name} className="w-full h-full" />
        {(product.sales_count ?? 0) > 5 && (
          <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide bg-orange-500 text-white px-2 py-0.5 rounded-full">
            Bestseller
          </span>
        )}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onFav(); }}
          aria-label="Favoritar"
          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow"
        >
          <Heart className={`w-4 h-4 ${isFav ? "fill-orange-500 text-orange-500" : "text-slate-500"}`} />
        </button>
      </Link>
      <div className="p-3 flex-1 flex flex-col">
        {product.category && (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{product.category}</span>
        )}
        <Link to={`/loja/produto/${product.id}`} className="font-semibold text-sm line-clamp-2 hover:text-orange-600">
          {product.name}
        </Link>
        {(product.rating_count ?? 0) > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3 h-3 fill-orange-500 text-orange-500" />
            <span className="text-xs font-medium">{rating.toFixed(1)}</span>
            <span className="text-[10px] text-muted-foreground">({product.rating_count})</span>
          </div>
        )}
        <div className="mt-2"><CatalogPrice product={product} price={product.price} /></div>
        <Button
          size="sm"
          className="mt-2 bg-orange-500 hover:bg-orange-600 h-9"
          disabled={outOfStock}
          onClick={(e) => { e.stopPropagation(); onAdd(); }}
        >
          {outOfStock ? "Indisponível" : product.has_variants ? "Escolher opções" : (<><Plus className="w-3 h-3 mr-1" /> Adicionar</>)}
        </Button>
      </div>
    </div>
  );
}
