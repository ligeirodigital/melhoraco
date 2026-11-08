import { CatalogPrice } from "@/components/catalog/CatalogPrice";
import { ProductImage } from "@/components/catalog/ProductImage";
import { useLandingCatalog } from "@/hooks/useLandingCatalog";
import { useState, useEffect } from "react";
import { Clock, CheckCircle2, ShoppingCart, ShieldCheck, MapPin, Truck, MessageSquare, ArrowRight, Instagram, Facebook, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.jfif";
import { Helmet } from "react-helmet-async";
import { openTrackedWhatsApp, type PageTrackingContext } from "@/lib/publicTracking";



interface ProductLandingPageProps {
  data: {
    id: string;
    trackingContext?: PageTrackingContext;
    title: string;
    headline: string;
    subheadline?: string;
    price: number;
    original_price?: number;
    whatsapp_number?: string;
    hero_image_url?: string;
    features?: any;
    testimonials?: any;
    meta_pixel_id?: string;
    google_tag_id?: string;
  };
}

export const ProductLandingPage = ({ data: pageData }: ProductLandingPageProps) => {
  const product = useLandingCatalog(pageData.title || pageData.headline);
  const data = { ...pageData, price: product?.price ?? pageData.price, original_price: product ? product.compare_at_price : pageData.original_price, hero_image_url: product?.image_url || pageData.hero_image_url };
  const priceProduct = product ?? { name: data.title, compare_at_price: data.original_price };
  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60); // 24 hours in seconds


  useEffect(() => {
    const timer = setInterval(() => {
      // Não consome CPU/render quando a aba não está visível.
      if (document.visibilityState !== "visible") return;
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 24 * 60 * 60));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleWhatsApp = async (qty: number = 1) => {
    const totalPrice = data.price * qty;
    const text = encodeURIComponent(`Olá! Quero aproveitar a promoção do ${data.title}${qty > 1 ? ` (${qty} unidades)` : ''} por R$${totalPrice}.`);
    const phone = data.whatsapp_number?.replace(/\D/g, '') || "5585999999999";
    
    openTrackedWhatsApp(`https://wa.me/${phone}?text=${text}`, data.trackingContext);
  };

  const features = Array.isArray(data.features) && data.features.length ? data.features : [
    "Aço inox",
    "Não enferruja",
    "Acabamento Polido Premium",
    "Frete Grátis em Fortaleza",
    "Até 3x sem juros",
    "Fabricação em até 7 dias"
  ];

  const steps = [
    { title: "Escolha os números desejados", desc: "Selecione o design e quantidade" },
    { title: "Confirmação do pedido", desc: "Enviamos a confirmação imediata" },
    { title: "Fabricação Premium", desc: "Produzimos em até 7 dias úteis" },
    { title: "Receba em casa", desc: "Entrega rápida via Uber Flash" }
  ];

  const faqs = [
    { q: "O material enferruja?", a: "Não. Utilizamos aço inox de alta qualidade, altamente resistente à corrosão, sol e chuva. Garantimos que não enferruja." },
    { q: "O frete para Fortaleza é grátis?", a: "Sim. O frete é grátis em toda Fortaleza via Uber Flash." },
    { q: "Posso parcelar?", a: "Sim. Parcelamos em até 3x sem juros no cartão." },
    { q: "Qual o prazo?", a: "Produção e entrega garantida em até 7 dias." }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-green-100 selection:text-green-900">
      <Helmet>
        {data.google_tag_id && (
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${data.google_tag_id}`}></script>
        )}
        {data.google_tag_id && (
          <script id="google-tag">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${data.google_tag_id}');
            `}
          </script>
        )}
      </Helmet>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-950 text-white pt-10 pb-20 px-6">
        <div className="max-w-4xl mx-auto space-y-10 relative z-10">
          <header className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Melhoraço" className="w-10 h-10 rounded-xl object-cover border border-white/20" />
              <span className="font-black text-xl tracking-tighter uppercase">Melhoraço</span>
            </div>
          </header>

          <div className="space-y-6 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-widest text-green-400">Oferta Especial Ativa</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-[0.95] max-w-2xl">
              {data.headline}
            </h1>
            
            <div className="flex flex-col md:flex-row items-center gap-4">
              <CatalogPrice product={priceProduct} price={data.price} />
            </div>

            <p className="text-lg md:text-xl text-white/70 font-medium max-w-xl leading-relaxed">
              {data.subheadline || "Fabricados em aço inox, resistentes à chuva, sol e não enferrujam. Frete grátis em Fortaleza via Uber Flash."}
            </p>

            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-green-500" /> {f}
                </div>
              ))}
            </div>

            <Button 
              onClick={() => handleWhatsApp(1)}
              className="w-full md:w-auto h-16 md:h-20 px-10 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-black text-xl md:text-2xl shadow-2xl shadow-green-500/20 group gap-3 active:scale-95 transition-all"
            >
              👉 QUERO MEU NÚMERO AGORA
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </Button>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2"></div>
      </section>

      {/* Timer Section */}
      <section className="bg-green-600 py-6 px-6 sticky top-0 z-50 shadow-xl">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-4 text-white">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 animate-pulse" />
            <span className="text-sm font-black uppercase tracking-widest">A PROMOÇÃO TERMINA EM:</span>
          </div>
          <div className="text-4xl font-mono font-black tracking-widest bg-black/20 px-6 py-2 rounded-xl backdrop-blur-sm">
            {formatTime(timeLeft)}
          </div>
          <span className="text-xs font-bold opacity-80 text-center md:text-left">Após o encerramento, o valor volta para R$90 por unidade.</span>
        </div>
      </section>

      {/* Product Visuals */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-5xl font-black tracking-tighter leading-none">Design que valoriza sua fachada.</h2>
              <p className="text-lg text-slate-500 font-medium leading-relaxed">O acabamento polido premium traz sofisticação e modernidade para seu imóvel, com a durabilidade que só o aço inox legítimo oferece.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-white p-2 rounded-3xl shadow-lg rotate-2 group hover:rotate-0 transition-all">
                  <div className="aspect-square rounded-2xl bg-slate-200 overflow-hidden flex items-center justify-center">
                    <ShoppingCart className="w-12 h-12 text-slate-300" />
                  </div>
               </div>
               <div className="bg-white p-2 rounded-3xl shadow-lg -rotate-3 group hover:rotate-0 transition-all translate-y-4">
                  <div className="aspect-square rounded-2xl bg-slate-200 overflow-hidden flex items-center justify-center">
                    <ShieldCheck className="w-12 h-12 text-slate-300" />
                  </div>
               </div>
            </div>
          </div>
          <div className="relative">
             <div className="bg-white p-6 rounded-[40px] shadow-2xl border-border">
                <div className="aspect-[4/5] rounded-[30px] bg-slate-200 overflow-hidden flex items-center justify-center">
                  <ProductImage src={data.hero_image_url} name={data.title} className="w-full h-full" />
                </div>
             </div>
             <div className="absolute -bottom-6 -right-6 bg-green-500 text-white p-6 rounded-3xl shadow-xl font-black text-center rotate-6">
                <p className="text-xs uppercase opacity-80">Garantia</p>
                <p className="text-3xl">ETERNA</p>
             </div>
          </div>
        </div>
      </section>

      {/* Credibility */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter">Desde 2011 fabricando números residenciais em aço inox</h2>
            <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">A Melhoraço é especializada em produtos premium. Produzimos utilizando aço inox de alta resistência, garantindo que não enferruja mesmo em regiões litorâneas.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-10 opacity-50 grayscale">
             <div className="flex items-center gap-2 font-black text-xl tracking-tighter italic">MELHORAÇO</div>
             <div className="flex items-center gap-2 font-black text-xl tracking-tighter italic">NÃO ENFERRUJA</div>
             <div className="flex items-center gap-2 font-black text-xl tracking-tighter italic">PREMIUM</div>
          </div>
        </div>
      </section>

      {/* Prices for multiple units */}
      <section className="py-24 px-6 bg-slate-900">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">De quantos numeros você precisa?</h2>
            <p className="text-white/60 font-medium">Quanto mais unidades, mais elegância para sua fachada.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[2, 3, 4].map((qty) => (
              <div key={qty} className="bg-white rounded-[3rem] p-8 flex flex-col items-center text-center space-y-6 shadow-2xl hover:scale-105 transition-transform">
                <div className="bg-green-500/10 text-green-600 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                  {qty} Unidades
                </div>
                <div className="space-y-1">
                  {data.original_price != null && data.original_price > data.price && <p className="text-muted-foreground line-through font-bold">R$ {qty * data.original_price}</p>}
                  <p className="text-3xl font-black text-foreground">R$ {qty * data.price}</p><CatalogPrice product={priceProduct} price={data.price} />
                </div>
                <div className="space-y-2 w-full">
                  <div className="flex items-center gap-2 text-slate-500 text-sm font-bold justify-center">
                    <CheckCircle2 className="w-4 h-4 text-green-500" /> Aço Inox (Não enferruja)
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-sm font-bold justify-center">
                    <Truck className="w-4 h-4 text-green-500" /> Frete Grátis
                  </div>
                </div>
                <Button 
                  onClick={() => handleWhatsApp(qty)}
                  className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-green-600 font-black"
                >
                  COMPRAR AGORA
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Offer Box (Single Unit) */}
      <section className="py-24 px-6 bg-slate-900 text-white border-t border-white/5">
        <div className="max-w-2xl mx-auto bg-white text-slate-900 rounded-[40px] overflow-hidden shadow-2xl relative">
          <div className="bg-green-500 text-white py-4 px-8 text-center font-black uppercase tracking-widest text-sm">
            🔥 Unidade Avulsa
          </div>
          <div className="p-10 md:p-16 space-y-10">
            <div className="text-center space-y-2">
              <CatalogPrice product={priceProduct} price={data.price} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <Truck className="w-6 h-6 text-green-600" />
                <span className="font-bold text-slate-700">Frete grátis para Fortaleza via Uber Flash</span>
              </div>
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <ShieldCheck className="w-6 h-6 text-green-600" />
                <span className="font-bold text-slate-700">Parcelamento em até 3x sem juros</span>
              </div>
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <Clock className="w-6 h-6 text-green-600" />
                <span className="font-bold text-slate-700">Produção e entrega em até 7 dias</span>
              </div>
            </div>

            <Button 
              onClick={() => handleWhatsApp(1)}
              className="w-full h-20 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-black text-2xl shadow-xl shadow-green-500/20 group gap-3"
            >
              👉 PEDIR PELO WHATSAPP
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 bg-white">
         <div className="max-w-4xl mx-auto space-y-16">
            <h2 className="text-4xl font-black text-center tracking-tighter">Como Funciona?</h2>
            <div className="grid md:grid-cols-4 gap-8">
               {steps.map((s, i) => (
                 <div key={i} className="space-y-4 text-center group">
                    <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto text-2xl font-black group-hover:bg-green-600 group-hover:scale-110 transition-all shadow-lg">
                      {i + 1}
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-black text-lg leading-tight">{s.title}</h4>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{s.desc}</p>
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto space-y-12">
          <h2 className="text-4xl font-black text-center tracking-tighter italic flex items-center justify-center gap-4">
            <MessageSquare className="w-10 h-10 text-primary" /> FAQ
          </h2>
          <div className="space-y-4">
            {faqs.map((f, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                <h4 className="font-black text-xl tracking-tight flex items-center gap-3">
                  <span className="w-2 h-2 bg-primary rounded-full"></span> {f.q}
                </h4>
                <p className="text-slate-500 font-medium leading-relaxed pl-5">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 text-center bg-slate-950 text-white overflow-hidden relative">
        <div className="max-w-3xl mx-auto space-y-8 relative z-10">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">Deixe sua fachada mais elegante hoje mesmo</h2>
          <p className="text-xl text-white/60 font-medium">Não perca a oportunidade de ter um produto eterno por um preço exclusivo.</p>
          <div className="space-y-6">
            <Button 
              onClick={() => handleWhatsApp(1)}
              className="w-full md:w-auto h-20 px-12 rounded-2xl bg-white text-slate-950 hover:bg-green-500 hover:text-white font-black text-2xl shadow-2xl active:scale-95 transition-all group gap-3"
            >
              👉 GARANTIR PROMOÇÃO
            </Button>
            <div className="flex items-center justify-center gap-2 text-red-500 font-black uppercase tracking-[0.2em] text-xs">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              ⚠️ Oferta válida somente pelas próximas 24 horas.
            </div>
          </div>
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 blur-[150px] rounded-full"></div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-slate-100">
         <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="flex flex-col items-center md:items-start gap-3">
              <div className="flex items-center gap-3">
                <img src={logo} alt="Melhoraço" className="w-10 h-10 rounded-xl object-cover" />
                <span className="font-black text-2xl tracking-tighter uppercase">Melhoraço</span>
              </div>
              <p className="text-sm font-bold text-slate-400">Desde 2011 transformando aço em elegância.</p>
            </div>
            <div className="flex gap-6">
              <Instagram className="w-6 h-6 text-slate-300 hover:text-primary cursor-pointer transition-colors" />
              <Facebook className="w-6 h-6 text-slate-300 hover:text-primary cursor-pointer transition-colors" />
              <Phone className="w-6 h-6 text-slate-300 hover:text-primary cursor-pointer transition-colors" />
            </div>
         </div>
         <div className="text-center mt-20 text-[10px] font-black uppercase tracking-[0.5em] text-slate-200">
            © 2026 Melhoraço Industrial • Todos os direitos reservados
         </div>
      </footer>

      {/* Floating WhatsApp Button for Mobile */}
      <button 
        onClick={() => handleWhatsApp(1)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-green-500 text-white rounded-full shadow-2xl flex items-center justify-center z-[100] md:hidden animate-bounce"
      >
        <Phone className="w-8 h-8" />
      </button>


    </div>
  );
};
