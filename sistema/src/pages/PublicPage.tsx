import { ProductImage } from "@/components/catalog/ProductImage";
import { appUrl } from "@/lib/appUrl";
import { CatalogPrice } from "@/components/catalog/CatalogPrice";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase, BUCKETS, FN_PREFIX } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Instagram, Facebook, Phone, Mail, ShoppingCart, ShieldCheck, CreditCard, Loader2, CheckCircle2, Clock, MapPin, Truck, FileText, Star, StarHalf, MessageSquare, Camera, PenTool, Upload, QrCode, Copy, DollarSign } from "lucide-react";

import { toast } from "sonner";
import { reportError } from "@/lib/reportError";
import { openTrackedWhatsApp, setTrackingPageContext } from "@/lib/publicTracking";
import { useMounted } from "@/hooks/useMounted";
import { formatCurrency } from "@/lib/formatQuote";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.jfif";
import { LazyPdfButton } from "@/components/LazyPdfButton";
import { saveFeedback, approveQuoteWithAssets, type FullQuote } from "@/lib/cloudStore";
import { ProductLandingPage } from "@/components/ProductLandingPage";
import { QuizLandingPage } from "@/components/QuizLandingPage";
import { generatePixPayload } from "@/lib/pix";
import { getQuoteTotal } from "@/lib/formatQuote";
import { QuoteChatDrawer } from "@/components/QuoteChatDrawer";
import { UpsellSection } from "@/components/UpsellSection";



type LandingPage = Database["melhoraco"]["Tables"]["landing_pages"]["Row"];
type ProductLandingPageData = Database["melhoraco"]["Tables"]["product_landing_pages"]["Row"];
type QuoteRow = Database["melhoraco"]["Tables"]["quotes"]["Row"];
type ProductRow = Database["melhoraco"]["Tables"]["products"]["Row"];
type ClientRow = Database["melhoraco"]["Tables"]["clients"]["Row"];
type BusinessSettings = Database["melhoraco"]["Tables"]["business_settings"]["Row"];
type QuoteItem = Database["melhoraco"]["Tables"]["quote_items"]["Row"] & {
  products?: ProductRow | null;
};
export type PublicQuote = QuoteRow & {
  clients?: ClientRow | null;
  quote_items?: QuoteItem[];
};

export default function PublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const mounted = useMounted();

  const isQuoteView = !!slug && (slug.startsWith("q_") || /^[A-Z0-9]{6,10}$/.test(slug));

  const quoteQuery = useQuery({
    queryKey: ["public-quote", slug],
    enabled: !!slug && isQuoteView,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_quote", { p_slug: slug! });
      if (error) throw error;
      if (!data) throw new Error("Orçamento não encontrado");
      return data as unknown as PublicQuote;
    },
  });

  const pageQuery = useQuery({
    queryKey: ["public-page", slug],
    enabled: !!slug && !isQuoteView,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
    queryFn: async () => {
      // As duas buscas são independentes (o slug pertence a uma ou outra
      // tabela), então rodam em paralelo em vez de encadeadas.
      const [{ data: lpData }, { data: plpData }] = await Promise.all([
        supabase.from("landing_pages").select("*").eq("slug", slug!).eq("is_active", true).maybeSingle(),
        supabase.from("product_landing_pages").select("*").eq("slug", slug!).eq("is_published", true).maybeSingle(),
      ]);
      if (lpData) return { kind: "lp" as const, data: lpData as LandingPage };
      if (plpData) return { kind: "plp" as const, data: plpData as ProductLandingPageData };
      return null;
    },
  });

  useEffect(() => {
    if (quoteQuery.isError) toast.error("Link inválido ou expirado");
  }, [quoteQuery.isError]);

  const loading = isQuoteView ? quoteQuery.isLoading : pageQuery.isLoading;
  const quote = quoteQuery.data;
  const pageResult = pageQuery.data;

  useEffect(() => {
    setTrackingPageContext(pageResult?.kind === "lp" ? { landing_page_id: pageResult.data.id } : pageResult?.kind === "plp" ? { product_landing_page_id: pageResult.data.id } : {});
  }, [pageResult]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isQuoteView && quote) {
    return <QuotePortal quote={quote} />;
  }

  if (pageResult?.kind === "plp") {
    const productPage = { ...pageResult.data, title: pageResult.data.name, headline: pageResult.data.name };
    if ((productPage as any).page_type === "quiz") {
      return <QuizLandingPage data={{ ...productPage, trackingContext: { product_landing_page_id: productPage.id } } as any} />;
    }
    return <ProductLandingPage data={{ ...productPage, trackingContext: { product_landing_page_id: productPage.id } } as any} />;
  }

  if (pageResult?.kind === "lp") {
    const page = pageResult.data;
    if ((page as any).page_type === "quiz") {
      return <QuizLandingPage data={{ ...page, trackingContext: { landing_page_id: page.id } } as any} />;
    }
    return <ProductLandingPage data={{ ...page, trackingContext: { landing_page_id: page.id } } as any} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-4 text-center">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-xl mb-8">Página não encontrada ou link expirado.</p>
      <Button asChild variant="outline" className="border-white text-white hover:bg-white hover:text-black">
        <Link to="/">Voltar ao Início</Link>
      </Button>
    </div>
  );
}

const QuotePortal = ({ quote: initialQuote }: { quote: PublicQuote }) => {
  const [quote, setQuote] = useState<PublicQuote>(initialQuote);
  const subtotal = initialQuote.quote_items?.reduce((acc: number, i: QuoteItem) => acc + (Number(i.unit_price) * Number(i.quantity)), 0) || 0;
  const total = getQuoteTotal({
    ...quote,
    items: (quote.quote_items || []).map((i: QuoteItem) => ({
      unit_price: Number(i.unit_price),
      quantity: Number(i.quantity)
    })) as unknown as FullQuote["items"]
  } as unknown as FullQuote);
  const [isSigning, setIsSigning] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [typedName, setTypedName] = useState("");
  
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [sendingFeedback, setSendingFeedback] = useState(false);

  // Referral
  const [referralInput, setReferralInput] = useState("");
  const [referralApplied, setReferralApplied] = useState<{ code: string; discount_pct: number } | null>(null);
  const [referralChecking, setReferralChecking] = useState(false);

  const applyReferral = async () => {
    const code = referralInput.trim();
    if (!code) return;
    setReferralChecking(true);
    try {
      const { data, error } = await supabase.rpc("validate_referral_code", { p_code: code });
      if (error) throw error;
      const res = data as { valid: boolean; discount_pct?: number; reason?: string };
      if (!res.valid) {
        toast.error(res.reason === "expired" ? "Código expirado" : res.reason === "not_active" ? "Código já usado" : "Código inválido");
        setReferralApplied(null);
      } else {
        setReferralApplied({ code, discount_pct: res.discount_pct ?? 0 });
        toast.success(`Desconto de ${res.discount_pct}% aplicado!`);
      }
    } catch (e) {
      toast.error("Erro ao validar código");
    } finally {
      setReferralChecking(false);
    }
  };

  const { data: settings } = useQuery({
    queryKey: ["public-business-settings"],
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("business_settings").select("*").maybeSingle();
      return data ?? null;
    },
  });


  
  const handleFeedback = async () => {
    if (rating === 0) return toast.error("Por favor, selecione uma nota.");
    if (!quote?.client_view_token) return toast.error("Sessão inválida.");
    setSendingFeedback(true);
    try {
      await saveFeedback({
        quote_id: quote.id,
        token: quote.client_view_token,
        rating,
        comment
      });
      setFeedbackSent(true);
      toast.success("Obrigado pelo seu feedback! Isso nos ajuda a crescer.");
    } catch (e) {
      toast.error("Erro ao enviar feedback.");
    } finally {
      setSendingFeedback(false);
    }
  };

  const renderTypedSignature = (name: string): string => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 180;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0f172a";
    ctx.font = "italic 64px 'Brush Script MT', 'Segoe Script', cursive";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name.trim(), canvas.width / 2, canvas.height / 2);
    return canvas.toDataURL("image/png");
  };

  const handleApprove = async (signatureDataUrl?: string, receiptFile?: File) => {
    if (!quote?.client_view_token) return toast.error("Sessão inválida.");
    setUploading(true);
    try {
      let signatureUrl = signatureDataUrl ?? quote.customer_signature_url;
      let receiptUrl = quote.payment_receipt_url;

      if (receiptFile) {
        const ext = receiptFile.name.split('.').pop();
        const filePath = `${quote.id}/receipt_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKETS.customerAssets)
          .upload(filePath, receiptFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from(BUCKETS.customerAssets).getPublicUrl(filePath);
        receiptUrl = publicUrl;
      }

      const updatedQuote = await approveQuoteWithAssets(quote.id, {
        token: quote.client_view_token,
        customer_signature_url: signatureUrl,
        payment_receipt_url: receiptUrl,
        status: "aprovado"
      });

      setQuote(updatedQuote as unknown as PublicQuote);
      setIsSigning(false);
      setIsPaying(false);

      if (referralApplied?.code) {
        try {
          await supabase.rpc("consume_referral_code", {
            p_quote_id: quote.id,
            p_token: quote.client_view_token,
            p_code: referralApplied.code,
          });
        } catch {
          /* silencioso — aprovação já foi salva */
        }
      }

      toast.success("Orçamento aprovado e assinado! 🎉 Já estamos preparando tudo por aqui.");
    } catch (e) {
      reportError(e, { scope: "public-quote/approve", fallbackMessage: "Erro ao processar aprovação" });
    } finally {
      setUploading(false);
    }
  };

  const validateSignatureName = (raw: string): string | null => {
    const name = raw.trim().replace(/\s+/g, " ");
    if (!name) return "Digite seu nome para assinar.";
    if (name.length < 5) return "Nome muito curto. Digite seu nome completo.";
    if (name.length > 80) return "Nome muito longo (máx. 80 caracteres).";
    const parts = name.split(" ").filter((p) => p.length >= 2);
    if (parts.length < 2) return "Digite nome e sobrenome (nome completo).";
    if (!/^[\p{L}\s'.-]+$/u.test(name)) return "Use apenas letras no nome.";
    return null;
  };

  const isSignatureValid = validateSignatureName(typedName) === null;

  const handleSignatureSubmit = () => {
    const name = typedName.trim().replace(/\s+/g, " ");
    const err = validateSignatureName(name);
    if (err) return toast.error(err);
    const dataUrl = renderTypedSignature(name);
    if (!dataUrl) return toast.error("Não foi possível gerar a assinatura. Tente novamente.");
    handleApprove(dataUrl);
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleApprove(undefined, file);
  };





  const deliveryFee = Number(quote.delivery_fee || 0);
  const installationFee = Number(quote.installation_fee || 0);
  // Deriva o desconto exibido a partir do próprio total (fonte da verdade),
  // evitando divergência com getQuoteTotal.
  const discountValue = Math.max(0, subtotal + deliveryFee + installationFee - Number(total || 0));

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Slim brand bar */}
      <div className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-slate-800 border border-slate-700 flex items-center justify-center rounded-lg">
              <div className="w-4 h-4 border-2 border-[hsl(var(--primary))] rotate-45" />
            </div>
            <span className="text-lg font-extrabold tracking-tight uppercase">
              Melhoraço<span className="text-[hsl(var(--primary))]">Inox</span>
            </span>
          </div>
          <span className={cn(
            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border",
            quote.status === "aprovado" ? "bg-green-500/10 text-green-400 border-green-500/30" :
            quote.status === "recusado" ? "bg-red-500/10 text-red-400 border-red-500/30" :
            "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] border-[hsl(var(--primary))]/30"
          )}>
            {quote.status}
          </span>
        </div>
      </div>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-10">
        <div className="w-full bg-white shadow-[0_20px_50px_rgba(0,0,0,0.08)] rounded-2xl overflow-hidden flex flex-col md:flex-row border border-slate-200">

          {/* Main content area */}
          <div className="flex-1 p-6 md:p-12">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1 tracking-tight">
                  Olá, {quote.clients?.name?.split(' ')[0] || 'Cliente'}
                </h1>
                <p className="text-slate-500 font-medium text-sm">
                  Referência: #{quote.order_token || quote.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <div className="hidden md:block text-right">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-widest border border-slate-200">
                  <Clock className="w-3 h-3" />
                  {new Date(quote.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>

            <p className="text-slate-600 leading-relaxed mb-10 max-w-xl">
              Confira abaixo os detalhes da sua proposta personalizada. Estamos prontos para iniciar a produção assim que você aprovar.
            </p>

            {/* Metadata grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" /> Endereço de Entrega
                </p>
                <p className="font-semibold text-slate-800 text-sm leading-snug">
                  {quote.delivery_address || "Retirada na fábrica"}
                </p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Truck className="w-3 h-3" /> Prazo Estimado
                </p>
                <p className="font-semibold text-slate-800 text-sm">
                  {quote.deadline || "A combinar"}
                </p>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Itens do Orçamento</h3>
                <span className="text-xs font-bold text-slate-500">
                  {quote.quote_items?.length} {quote.quote_items?.length === 1 ? 'item' : 'itens'}
                </span>
              </div>

              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <th className="py-3">Descrição</th>
                      <th className="py-3 text-center w-16">Qtd</th>
                      <th className="py-3 text-right w-32">Unitário</th>
                      <th className="py-3 text-right w-32">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700 divide-y divide-slate-100">
                    {quote.quote_items?.map((item: any, i: number) => (
                      <tr key={i}>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <ProductImage src={item.products?.image_url} name={item.product_name} className="w-10 h-10 shrink-0 rounded-md" />
                            <span className="font-bold text-slate-900">{item.product_name}</span>
                          </div>
                        </td>
                        <td className="py-4 text-center font-mono text-sm text-slate-600">{String(item.quantity).padStart(2, '0')}</td>
                        <td className="py-4 text-right text-sm"><CatalogPrice product={{ ...item.products, name: item.product_name }} price={item.unit_price} /></td>
                        <td className="py-4 text-right font-bold text-slate-900">{formatCurrency(item.unit_price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <div className="md:hidden space-y-3">
                {quote.quote_items?.map((item: any, i: number) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-start gap-3">
                      <ProductImage src={item.products?.image_url} name={item.product_name} className="w-12 h-12 shrink-0 rounded-md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 leading-tight">{item.product_name}</p>
                        <div className="flex justify-between items-baseline mt-2 text-sm">
                          <div><span className="text-muted-foreground">{item.quantity} ×</span><CatalogPrice product={{ ...item.products, name: item.product_name }} price={item.unit_price} /></div>
                          <span className="font-bold text-slate-900">{formatCurrency(item.unit_price * item.quantity)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <UpsellSection quoteId={quote.id} token={(quote as any).client_view_token} />
            </div>
          </div>

          {/* Dark Sidebar Summary */}
          <div className="w-full md:w-96 bg-slate-900 p-8 md:p-10 text-white flex flex-col justify-between">
            <div>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.25em] mb-6">Resumo Financeiro</h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="font-mono font-medium">{formatCurrency(subtotal)}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 flex items-center gap-1.5"><Truck className="w-3 h-3" /> Frete</span>
                    <span className="font-mono font-medium">{formatCurrency(deliveryFee)}</span>
                  </div>
                )}
                {installationFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400 flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" /> Instalação</span>
                    <span className="font-mono font-medium">{formatCurrency(installationFee)}</span>
                  </div>
                )}
                {discountValue > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Desconto{quote.discount_type === 'percent' ? ` (${quote.discount_amount}%)` : ''}</span>
                    <span className="font-mono font-medium text-[hsl(var(--primary))]">− {formatCurrency(discountValue)}</span>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-slate-800 mb-8">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] block mb-2">Total do Investimento</span>
                <div className="text-4xl font-extrabold text-white tracking-tight font-mono">
                  {formatCurrency(total)}
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-800/60 border border-slate-700/60 rounded-lg">
                <ShieldCheck className="w-4 h-4 text-[hsl(var(--primary))] shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Aço Inox 304 • Garantia Melhoraço</span>
              </div>
            </div>

            {quote.status !== "aprovado" && (
              <div className="mt-8 space-y-3">
                <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-lg">
                  {referralApplied ? (
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-green-400">Código aplicado</p>
                        <p className="text-sm font-black text-white">{referralApplied.code} · {referralApplied.discount_pct}% off</p>
                      </div>
                      <button
                        onClick={() => { setReferralApplied(null); setReferralInput(""); }}
                        className="text-[10px] uppercase text-slate-400 hover:text-white tracking-widest font-bold"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Código de indicação (opcional)</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={referralInput}
                          onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                          placeholder="Ex: JOAO1234"
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white uppercase tracking-widest focus:outline-none focus:border-[hsl(var(--primary))]"
                        />
                        <button
                          onClick={applyReferral}
                          disabled={referralChecking || !referralInput.trim()}
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold uppercase tracking-widest rounded-md disabled:opacity-40"
                        >
                          {referralChecking ? "..." : "Aplicar"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={() => document.getElementById('acoes')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="block w-full bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white text-center font-bold py-4 rounded-lg transition-all shadow-lg uppercase tracking-wide text-sm"
                >
                  Aprovar e Pagar
                </button>
                <p className="text-[10px] text-slate-500 text-center uppercase font-medium tracking-widest">
                  PIX • Cartão • Assinatura Digital
                </p>
              </div>
            )}
            {quote.status === "aprovado" && (
              <div className="mt-8 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                <CheckCircle2 className="w-6 h-6 text-green-400 mx-auto mb-1" />
                <p className="text-xs font-bold uppercase tracking-widest text-green-400">Pedido Aprovado</p>
              </div>
            )}
          </div>
        </div>

        <div id="acoes" className="space-y-4 mt-8">
          {isSigning && quote.status !== "aprovado" && (
            <div className="bg-white p-6 md:p-8 rounded-3xl border-2 border-primary/20 shadow-xl animate-in zoom-in-95 space-y-6">
              <div className="text-center space-y-1">
                <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm">Assinatura Digital</h3>
                <p className="text-xs text-slate-500 font-bold">Digite seu nome completo para assinar</p>
              </div>

              <div className="space-y-3">
                <Input
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="h-14 text-base rounded-2xl text-center font-semibold"
                  autoFocus
                />
                {isSignatureValid && (
                  <div className="bg-slate-50 border-2 border-dashed rounded-2xl h-24 flex items-center justify-center overflow-hidden">
                    <span
                      className="text-4xl text-slate-900"
                      style={{ fontFamily: "'Brush Script MT','Segoe Script',cursive", fontStyle: "italic" }}
                    >
                      {typedName.trim().replace(/\s+/g, " ")}
                    </span>
                  </div>
                )}
                {!isSignatureValid && typedName.length > 0 && (
                  <p className="text-[11px] text-red-600 text-center font-semibold">
                    {validateSignatureName(typedName)}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 text-center">
                  Ao clicar em confirmar, você aceita os termos e assina digitalmente este orçamento.
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <Button variant="outline" className="h-14 rounded-2xl font-bold order-2 md:order-1" onClick={() => setIsSigning(false)}>CANCELAR</Button>
                <Button 
                  className="h-14 rounded-2xl font-black flex-1 order-1 md:order-2 gap-2" 
                  onClick={handleSignatureSubmit}
                  disabled={uploading || !isSignatureValid}
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <PenTool className="w-5 h-5" />}
                  CONFIRMAR E ASSINAR
                </Button>
              </div>
            </div>
          )}

          {isPaying && quote.status !== "aprovado" && (
            <div className="bg-white p-6 md:p-8 rounded-3xl border-2 border-green-500/20 shadow-xl animate-in zoom-in-95 space-y-6">
              <div className="text-center space-y-1">
                <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm text-green-600">Pagamento via PIX</h3>
                <p className="text-xs text-slate-500 font-bold">Escaneie o QR Code ou use a chave abaixo</p>
              </div>

              <div className="flex flex-col items-center gap-6 py-4">
                <div className="w-56 h-56 bg-white rounded-2xl flex items-center justify-center border-2 border-dashed border-green-100 shadow-inner overflow-hidden">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(generatePixPayload(settings?.nubank_pix_key || "thiago@melhoraco.com.br", total, settings?.nubank_pix_name || "JOSE THIAGO OLIVEIRA", "FORTALEZA", quote.order_token || quote.id.slice(0, 6)))}`} 
                    alt="QR Code PIX" 
                    className="w-48 h-48"
                  />
                </div>
                
                <div className="w-full space-y-3">
                  <div className="bg-slate-50 p-4 rounded-xl flex flex-col items-center gap-2 border border-slate-200">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Código PIX Copia e Cola</p>
                    <div className="flex items-center gap-2 w-full">
                      <div className="flex-1 truncate font-mono text-[10px] text-slate-500 bg-white p-2 rounded border">
                        {generatePixPayload(settings?.nubank_pix_key || "thiago@melhoraco.com.br", total, settings?.nubank_pix_name || "JOSE THIAGO OLIVEIRA", "FORTALEZA", quote.order_token || quote.id.slice(0, 6))}
                      </div>
                      <Button 
                        size="icon" 
                        variant="secondary" 
                        className="shrink-0 h-10 w-10 rounded-lg"
                        onClick={() => {
                          const payload = generatePixPayload(settings?.nubank_pix_key || "thiago@melhoraco.com.br", total, settings?.nubank_pix_name || "JOSE THIAGO OLIVEIRA", "FORTALEZA", quote.order_token || quote.id.slice(0, 6));
                          navigator.clipboard.writeText(payload);
                          toast.success("Código PIX copiado!");
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="bg-green-50/50 p-4 rounded-xl flex flex-col items-center gap-2 border border-green-100">
                    <p className="text-[10px] font-black uppercase text-green-600 tracking-widest">Chave PIX</p>
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                       {settings?.nubank_pix_key || "thiago@melhoraco.com.br"}
                       <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-6 w-6 text-slate-400 hover:text-primary"
                        onClick={() => {
                          navigator.clipboard.writeText(settings?.nubank_pix_key || "thiago@melhoraco.com.br");
                          toast.success("Chave PIX copiada!");
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>


                <div className="w-full pt-4 border-t">
                  <label className="flex flex-col items-center gap-3 cursor-pointer group">
                    <div className="w-full h-16 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center gap-2 group-hover:border-primary transition-all group-hover:bg-primary/5">
                      <Upload className="w-5 h-5 text-slate-400 group-hover:text-primary" />
                      <span className="text-xs font-black uppercase text-slate-400 group-hover:text-primary">Anexar Comprovante</span>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleReceiptUpload} />
                  </label>
                </div>
              </div>

              <Button variant="ghost" className="w-full h-12 rounded-xl font-bold" onClick={() => setIsPaying(false)}>VOLTAR</Button>
            </div>
          )}

          {!isSigning && !isPaying && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.06)] p-6 md:p-8 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Escolha como continuar</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:inline">Pagamento seguro</span>
              </div>

              {quote.status !== "aprovado" ? (
                <>
                  {/* Primary CTA — Card */}
                  <Button
                    onClick={async () => {
                      try {
                        toast.loading("Gerando link de pagamento...", { id: "ip-link" });
                        const { data, error } = await supabase.functions.invoke(
                          `${FN_PREFIX}infinitypay-create-link`,
                          { body: { quoteId: quote.id, redirectUrl: `${appUrl()}/pedido/${quote.id}/sucesso` } },
                        );
                        toast.dismiss("ip-link");
                        if (error) throw error;
                        if (!data?.url) throw new Error("Link não retornado");
                        window.location.href = data.url;
                      } catch (e) {
                        toast.dismiss("ip-link");
                        reportError(e, { scope: "public-quote/infinitypay", fallbackMessage: "Falha ao gerar link InfinityPay" });
                      }
                    }}
                    className="w-full h-14 rounded-lg font-bold gap-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white shadow-lg uppercase tracking-wide text-sm"
                  >
                    <CreditCard className="w-5 h-5" />
                    Pagar com Cartão
                    <span className="text-[10px] font-medium opacity-70 ml-1">• InfinityPay</span>
                  </Button>

                  {/* Secondary row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Button
                      onClick={() => setIsPaying(true)}
                      variant="outline"
                      className="h-12 rounded-lg font-bold gap-2 border-slate-200 hover:border-slate-900 hover:bg-slate-50 text-slate-700 uppercase tracking-wide text-xs"
                    >
                      <QrCode className="w-4 h-4" />
                      Pagar via PIX
                    </Button>
                    <Button
                      onClick={() => setIsSigning(true)}
                      variant="outline"
                      className="h-12 rounded-lg font-bold gap-2 border-slate-200 hover:border-slate-900 hover:bg-slate-50 text-slate-700 uppercase tracking-wide text-xs"
                    >
                      <PenTool className="w-4 h-4" />
                      Assinar e Fechar
                    </Button>
                  </div>

                  {/* Tertiary — help */}
                  <button
                    onClick={() => {
                      const msg = encodeURIComponent(`Olá, estou vendo o orçamento #${quote.order_token || quote.id.slice(0,8)} e gostaria de tirar uma dúvida.`);
                      openTrackedWhatsApp(`https://wa.me/5511942637222?text=${msg}`);
                    }}
                    className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-green-600 transition-colors uppercase tracking-widest pt-2"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Dúvidas? Falar no WhatsApp
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                  <div className="flex-1">
                    <p className="font-bold text-green-800 text-sm">Pedido aprovado e assinado</p>
                    <p className="text-xs text-green-700/80">Nossa equipe já iniciou a produção.</p>
                  </div>
                </div>
              )}
            </div>
          )}


          {quote.status === "aprovado" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 p-6 rounded-3xl border border-green-100 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-black text-green-700 uppercase tracking-widest text-[10px]">Identificador do Pedido</p>
                    <p className="text-2xl font-black text-green-900 tracking-tighter">#{quote.order_token || "GERANDO..."}</p>
                  </div>
                </div>

                {quote.customer_signature_url && (
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Assinado Digitalmente</p>
                      <p className="text-xs font-bold text-slate-600">{new Date(quote.signed_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <img src={quote.customer_signature_url} className="h-10 object-contain grayscale opacity-50" />
                  </div>
                )}
              </div>


              <LazyPdfButton
                fileName={`OS_${quote.order_token || quote.id.slice(0,8)}.pdf`}
                className="w-full"
                documentFactory={async () => {
                  const { ServiceOrderPDF } = await import("@/components/ServiceOrderPDF");
                  return <ServiceOrderPDF quote={quote as unknown as FullQuote} />;
                }}
              >
                <Button asChild className="w-full h-16 rounded-2xl bg-slate-900 font-black text-lg gap-3">
                  <span><FileText className="w-6 h-6" /> BAIXAR ORDEM DE SERVIÇO (OS)</span>
                </Button>
              </LazyPdfButton>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {quote.status === "aprovado" && !feedbackSent && (
            <section className="bg-white p-8 rounded-3xl border border-border shadow-2xl shadow-black/5 space-y-6 animate-in fade-in duration-700">
               <div className="text-center space-y-2">
                  <h3 className="text-xl font-black tracking-tight text-foreground">Sua opinião é importante!</h3>
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Como foi sua experiência com a Melhoraço?</p>
               </div>
               
               <div className="flex justify-center gap-2">
                  {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                    <button
                      key={n}
                      onClick={() => setRating(n)}
                      className={cn(
                        "w-8 h-10 md:w-10 md:h-12 rounded-xl font-black text-sm transition-all",
                        rating === n ? "bg-primary text-white scale-110 shadow-lg" : "bg-muted text-muted-foreground hover:bg-primary/20"
                      )}
                    >
                      {n}
                    </button>
                  ))}
               </div>

               <div className="space-y-4">
                  <textarea 
                    placeholder="Deixe um comentário sobre o atendimento ou produto (opcional)..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full h-24 bg-muted rounded-2xl p-4 text-sm font-bold border-none focus:ring-2 focus:ring-primary/20 outline-none resize-none text-foreground placeholder:text-muted-foreground/50"
                  />
                  <Button 
                    onClick={handleFeedback}
                    disabled={rating === 0 || sendingFeedback}
                    className="w-full h-14 rounded-2xl font-black gap-2 shadow-lg"
                  >
                    {sendingFeedback ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
                    ENVIAR AVALIAÇÃO
                  </Button>
               </div>
            </section>
          )}

          {feedbackSent && (
            <section className="bg-green-500/10 p-8 rounded-3xl border border-green-500/20 text-center space-y-2 animate-in zoom-in-95 duration-500">
               <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
               <h3 className="text-xl font-black text-green-500">Feedback recebido!</h3>
               <p className="text-sm font-bold text-green-500/70 uppercase tracking-widest">Obrigado por nos ajudar a melhorar.</p>
            </section>
          )}
        </div>

        <section className="bg-blue-600 p-8 rounded-3xl text-white space-y-4 shadow-xl">
           <h3 className="text-2xl font-black tracking-tighter">Garantia Melhoraço</h3>
           <p className="font-bold opacity-90 leading-relaxed text-sm">
             Trabalhamos com o melhor material do mercado para garantir que seu número ou caixa de correio brilhe por décadas sem enferrujar. Ao aprovar, nossa equipe iniciará a reserva do material imediatamente.
           </p>
        </section>
      </main>

      <footer className="py-10 text-center opacity-40 text-[10px] font-black uppercase tracking-[0.3em]">
         Melhoraço Inox • Gestão de Alta Performance
      </footer>

      {quote?.id && quote?.client_view_token && (
        <QuoteChatDrawer
          quoteId={quote.id}
          token={quote.client_view_token}
          clientName={(quote as any).clients?.name}
        />
      )}
    </div>
  );
};
