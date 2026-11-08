import { CatalogPrice } from "@/components/catalog/CatalogPrice";
import { ProductImage } from "@/components/catalog/ProductImage";
import { useLandingCatalog } from "@/hooks/useLandingCatalog";
import { useState, useEffect, useRef } from "react";
import { 
  Clock, 
  CheckCircle2, 
  MapPin, 
  Truck, 
  MessageSquare, 
  ArrowRight, 
  Phone, 
  Loader2, 
  ChevronRight,
  User,
  Hash,
  Home,
  CreditCard,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.jfif";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatQuote";
import { Helmet } from "react-helmet-async";
import { useUTM } from "@/hooks/useUTM";
import { reportError } from "@/lib/reportError";
import { newEventId, trackMetaEvent } from "@/lib/metaPixel";
import { openTrackedWhatsApp, trackWhatsAppClick, type PageTrackingContext } from "@/lib/publicTracking";

interface QuizLandingPageProps {
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
    meta_pixel_id?: string;
    google_tag_id?: string;
  };
}

export const QuizLandingPage = ({ data: pageData }: QuizLandingPageProps) => {
  const product = useLandingCatalog(pageData.title || pageData.headline);
  const data = { ...pageData, price: product?.price ?? pageData.price, original_price: product ? product.compare_at_price : pageData.original_price, hero_image_url: product?.image_url || pageData.hero_image_url };
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60);
  const utm = useUTM();
  const [submitError, setSubmitError] = useState("");
  const submitting = useRef(false);
  const leadEventId = useRef(newEventId());

  // Form State
  const [formData, setFormData] = useState({
    quantity: 1,
    first_name: "",
    last_name: "",
    whatsapp: "",
    desired_number: "",
    cep: "",
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    complement: "",
  });

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

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleCEP = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, "");
    setFormData(prev => ({ ...prev, cep: cleanCEP }));
    if (cleanCEP.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
          }));
        }
      } catch (e) {
        console.error("CEP fetch error", e);
      }
    }
  };

  const formatWhatsApp = (value: string) => {
    const v = value.replace(/\D/g, "");
    if (v.length <= 11) {
      let formatted = v;
      if (v.length > 2) formatted = `(${v.substring(0, 2)}) ${v.substring(2)}`;
      if (v.length > 7) formatted = `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7, 11)}`;
      return formatted;
    }
    return value;
  };

  const handleSubmit = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setSubmitError("");
    setLoading(true);
    const popup = window.open("about:blank", "_blank");
    const total_value = formData.quantity * (data.price || 59);
    
    try {
      const { error } = await supabase.from("quiz_leads").insert({
        ...(data.trackingContext ?? { landing_page_id: data.id }),
        event_id: leadEventId.current,
        page_path: window.location.pathname,
        quantity: formData.quantity,
        total_value,
        first_name: formData.first_name,
        last_name: formData.last_name,
        whatsapp: formData.whatsapp,
        desired_number: formData.desired_number,
        cep: formData.cep,
        street: formData.street,
        number: formData.number,
        neighborhood: formData.neighborhood,
        city: formData.city,
        complement: formData.complement,
        ...utm
      });

      if (error && error.code !== "23505") throw error;
      trackMetaEvent("Lead", { value: total_value, currency: "BRL", num_items: formData.quantity }, leadEventId.current);

      // WhatsApp Message
      const message = `Olá! Vim pelo site da Melhoraço.

Meu pedido:
• Quantidade: ${formData.quantity} números
• Valor total: ${formatCurrency(total_value)}
• Número desejado: ${formData.desired_number}

Dados:
• Nome: ${formData.first_name} ${formData.last_name}
• WhatsApp: ${formData.whatsapp}

Endereço:
• CEP: ${formData.cep}
• Rua: ${formData.street}
• Número: ${formData.number}
• Bairro: ${formData.neighborhood}
• Cidade: ${formData.city}

Quero confirmar meu pedido.`;

      const phone = data.whatsapp_number?.replace(/\D/g, "") || "5585999999999";
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      trackWhatsAppClick(url, data.trackingContext);
      if (popup) { popup.opener = null; popup.location.href = url; }
      else toast.info("Pedido salvo. Toque em Chamar no WhatsApp para continuar.");
      
      nextStep();
    } catch (e: any) {
      popup?.close();
      reportError(e, { scope: "quiz-submit", silent: true, extra: { eventId: leadEventId.current, pagePath: window.location.pathname } });
      setSubmitError("Não conseguimos enviar seu pedido. Seus dados foram mantidos; tente novamente.");
      toast.error("Não conseguimos enviar seu pedido. Tente novamente.");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  const totalValue = formData.quantity * (data.price || 59);
  const progress = (step / 5) * 100;

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-green-100 selection:text-green-900 flex flex-col">
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
      {/* Header */}
      <header className="bg-white border-b py-4 px-6 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Melhoraço" className="w-8 h-8 rounded-lg object-cover shadow-sm" />
          <span className="font-black text-lg tracking-tighter uppercase">Melhoraço</span>
        </div>
        {step > 1 && step < 5 && (
          <div className="flex items-center gap-4">
            <Progress value={progress} className="w-32 h-2" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Etapa {step}/4</span>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col">
        {step === 1 && (
          <section className="flex-1 flex flex-col justify-center px-6 py-12 max-w-4xl mx-auto w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-6 text-center">
              <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-full">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-green-600">Oferta Especial Ativa</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none text-slate-900">
                {data.headline || "Números em Aço Inox Premium para sua Fachada"}
              </h1>
              
              <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                <div className="relative group">
                  <div className="bg-white p-4 rounded-[32px] shadow-2xl border border-slate-100 rotate-2 group-hover:rotate-0 transition-transform duration-500">
                    <div className="w-64 h-64 md:w-80 md:h-80 bg-slate-100 rounded-[24px] overflow-hidden">
                      <ProductImage src={data.hero_image_url} name={data.title} className="w-full h-full" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 text-left max-w-sm">
                  <CatalogPrice product={product ?? { name: data.title, compare_at_price: data.original_price }} price={data.price} />
                  {[
                    "Inox AISI 304 legítimo",
                    "Não enferruja (Garantia Eterna)",
                    "Acabamento Polido Premium",
                    "Entrega grátis em Fortaleza",
                    "Fabricação em até 7 dias",
                    "Até 3x sem juros no cartão",
                    "Pague somente na entrega"
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-center gap-3 font-bold text-slate-600">
                      <div className="w-6 h-6 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4" />
                      </div>
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Button 
              onClick={nextStep}
              className="w-full max-w-md mx-auto h-20 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xl shadow-2xl shadow-slate-900/20 group gap-3"
            >
              👉 FAZER MEU ORÇAMENTO
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </Button>

            <div className="text-center space-y-4">
               <div className="bg-green-600 text-white py-3 px-6 rounded-xl inline-flex items-center gap-3 font-mono font-black shadow-lg">
                  <Clock className="w-5 h-5 animate-pulse" />
                  PROMOÇÃO EXPIRA EM: {formatTime(timeLeft)}
               </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="flex-1 flex flex-col justify-center px-6 py-12 max-w-xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-black tracking-tighter">Quantos números você precisa?</h2>
              <p className="text-slate-500 font-medium">{formatCurrency(data.price || 59)} por dígito</p>
            </div>

            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 space-y-8">
              <div className="flex items-center justify-center gap-6">
                <Button 
                  variant="outline" 
                  className="w-16 h-16 rounded-2xl text-2xl font-black border-2"
                  onClick={() => setFormData(p => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))}
                >
                  -
                </Button>
                <div className="w-24 text-center">
                  <span className="text-5xl font-black tracking-tighter">{formData.quantity}</span>
                </div>
                <Button 
                  variant="outline" 
                  className="w-16 h-16 rounded-2xl text-2xl font-black border-2"
                  onClick={() => setFormData(p => ({ ...p, quantity: p.quantity + 1 }))}
                >
                  +
                </Button>
              </div>

              <div className="bg-slate-900 text-white p-8 rounded-3xl space-y-2 text-center shadow-2xl shadow-slate-900/20">
                <p className="text-xs font-black uppercase tracking-[0.2em] opacity-60">Total do Investimento</p>
                <p className="text-5xl font-black tracking-tighter">{formatCurrency(totalValue)}</p>
              </div>

              <div className="space-y-3">
                {[
                  { icon: Truck, text: "Entrega grátis para Fortaleza" },
                  { icon: CreditCard, text: "Até 3x sem juros no cartão" },
                  { icon: MessageSquare, text: "Pode pagar na entrega" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 font-bold text-slate-500 text-sm">
                    <item.icon className="w-5 h-5 text-green-500" />
                    {item.text}
                  </div>
                ))}
              </div>
            </div>

            <Button 
              onClick={nextStep}
              className="w-full h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-lg gap-3"
            >
              CONTINUAR <ChevronRight className="w-5 h-5" />
            </Button>
          </section>
        )}

        {step === 3 && (
          <section className="flex-1 flex flex-col justify-center px-6 py-12 max-w-xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-black tracking-tighter">Para quem vamos enviar o orçamento?</h2>
              <p className="text-slate-500 font-medium">Preencha seus dados para personalizarmos seu atendimento.</p>
            </div>

            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <Input 
                      placeholder="Ex: João" 
                      className="pl-10 h-14 rounded-xl font-bold border-slate-200"
                      value={formData.first_name}
                      onChange={e => setFormData(p => ({ ...p, first_name: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sobrenome</label>
                  <Input 
                    placeholder="Ex: Silva" 
                    className="h-14 rounded-xl font-bold border-slate-200"
                    value={formData.last_name}
                    onChange={e => setFormData(p => ({ ...p, last_name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">WhatsApp</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <Input 
                    placeholder="(85) 99999-9999" 
                    className="pl-10 h-14 rounded-xl font-bold border-slate-200"
                    value={formData.whatsapp}
                    onChange={e => setFormData(p => ({ ...p, whatsapp: formatWhatsApp(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Número(s) Desejado(s)</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <Input 
                    placeholder="Ex: 125 / 340 / 1208" 
                    className="pl-10 h-14 rounded-xl font-bold border-slate-200"
                    value={formData.desired_number}
                    onChange={e => setFormData(p => ({ ...p, desired_number: e.target.value }))}
                  />
                </div>
                <p className="text-[10px] font-medium text-slate-400">Informe os números que deseja fabricar em aço inox.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={prevStep} className="h-16 px-6 rounded-2xl font-bold border-2">VOLTAR</Button>
              <Button 
                onClick={nextStep}
                disabled={!formData.first_name || !formData.whatsapp || !formData.desired_number}
                className="flex-1 h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-lg gap-3"
              >
                CONTINUAR <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="flex-1 flex flex-col justify-center px-6 py-12 max-w-xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-black tracking-tighter">Onde será a entrega?</h2>
              <p className="text-slate-500 font-medium">Frete grátis em Fortaleza. Entrega rápida via Uber Flash.</p>
            </div>

            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">CEP</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <Input 
                    placeholder="00000-000" 
                    className="pl-10 h-14 rounded-xl font-bold border-slate-200"
                    value={formData.cep}
                    onChange={e => handleCEP(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rua</label>
                  <Input 
                    placeholder="Nome da rua" 
                    className="h-14 rounded-xl font-bold border-slate-200"
                    value={formData.street}
                    onChange={e => setFormData(p => ({ ...p, street: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nº</label>
                  <Input 
                    placeholder="123" 
                    className="h-14 rounded-xl font-bold border-slate-200"
                    value={formData.number}
                    onChange={e => setFormData(p => ({ ...p, number: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bairro</label>
                  <Input 
                    placeholder="Ex: Aldeota" 
                    className="h-14 rounded-xl font-bold border-slate-200"
                    value={formData.neighborhood}
                    onChange={e => setFormData(p => ({ ...p, neighborhood: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cidade</label>
                  <div className="relative">
                    <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <Input 
                      placeholder="Fortaleza" 
                      className="pl-10 h-14 rounded-xl font-bold border-slate-200"
                      value={formData.city}
                      onChange={e => setFormData(p => ({ ...p, city: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Complemento (Opcional)</label>
                <Input 
                  placeholder="Apt, bloco, ponto de referência" 
                  className="h-14 rounded-xl font-bold border-slate-200"
                  value={formData.complement}
                  onChange={e => setFormData(p => ({ ...p, complement: e.target.value }))}
                />
              </div>
            </div>

            {submitError && <p role="alert" className="text-destructive text-sm">{submitError}</p>}
            <div className="flex gap-4">
              <Button variant="outline" onClick={prevStep} className="h-16 px-6 rounded-2xl font-bold border-2">VOLTAR</Button>
              <Button 
                onClick={handleSubmit}
                disabled={loading || !formData.street || !formData.number}
                className="flex-1 h-16 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-black text-lg gap-3 shadow-xl shadow-green-500/20"
              >
                {loading ? <Loader2 className="animate-spin" /> : "FINALIZAR PEDIDO 🎉"}
              </Button>
            </div>
          </section>
        )}

        {step === 5 && (
          <section className="flex-1 flex flex-col justify-center px-6 py-12 max-w-xl mx-auto w-full space-y-10 animate-in zoom-in-95 duration-700">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto shadow-2xl animate-bounce">
                <Check className="w-12 h-12" strokeWidth={4} />
              </div>
              <h2 className="text-4xl font-black tracking-tighter">Seu orçamento está pronto 🎉</h2>
              <p className="text-slate-500 font-bold max-w-xs mx-auto">Clique no botão abaixo para confirmar seu pedido via WhatsApp.</p>
            </div>

            <div className="bg-white p-8 rounded-[2rem] shadow-xl border-2 border-green-500/20 space-y-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-bl-xl">
                 Resumo
               </div>
               
               <div className="space-y-4 pt-4">
                  <div className="flex justify-between items-center border-b pb-4 border-slate-50">
                    <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Quantidade</span>
                    <span className="font-black text-xl">{formData.quantity} números</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-4 border-slate-50">
                    <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Valor Total</span>
                    <span className="font-black text-3xl text-green-600">{formatCurrency(totalValue)}</span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-4 border-slate-50">
                    <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Pagamento</span>
                    <span className="font-bold text-slate-700">Até 3x sem juros</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Entrega</span>
                    <span className="font-bold text-green-600">Grátis (Fortaleza)</span>
                  </div>
               </div>
            </div>

            <Button 
              onClick={async () => {
                const phone = data.whatsapp_number?.replace(/\D/g, "") || "5585999999999";
                const message = `Olá! Vim pelo site da Melhoraço.
 
 Meu pedido:
 • Quantidade: ${formData.quantity} números
 • Valor total: ${formatCurrency(totalValue)}
• Número desejado: ${formData.desired_number}

Dados:
• Nome: ${formData.first_name} ${formData.last_name}
• WhatsApp: ${formData.whatsapp}

Quero confirmar meu pedido.`;

                openTrackedWhatsApp(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, data.trackingContext);
              }}
              className="w-full h-20 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-black text-2xl shadow-2xl shadow-green-500/20 gap-3 group"
            >
              <MessageSquare className="w-8 h-8 fill-white/20" />
              CHAMAR NO WHATSAPP
            </Button>

            <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
              Aguardamos sua mensagem para iniciar a produção.
            </p>
          </section>
        )}
      </main>

      {/* Floating WhatsApp Button */}
      {step < 5 && (
        <button 
          onClick={async () => {
            const phone = data.whatsapp_number?.replace(/\D/g, "") || "5585999999999";
            
            openTrackedWhatsApp(`https://wa.me/${phone}`, data.trackingContext);
          }}
          className="fixed bottom-6 right-6 w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform z-40 animate-in fade-in zoom-in"
        >
          <Phone className="w-8 h-8" />
        </button>
      )}

      {/* Footer */}
      <footer className="py-8 px-6 text-center text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] bg-white border-t">
        © {new Date().getFullYear()} Melhoraço Inox • Todos os direitos reservados
      </footer>

    </div>
  );
};
