import { useState, useEffect } from "react";
import { DbProduct, fetchProducts, saveFullQuote, upsertClient, fetchClients, DbClient, supabase, deleteProduct, deleteProductVariant, hideProduct } from "@/lib/cloudStore";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, ArrowLeft, Save, Loader2, User, MapPin, Calendar, Truck, CheckCircle, Plus, CreditCard, EyeOff, Eye, Zap, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, groupQuoteItems, parsePaymentMethod } from "@/lib/formatQuote";
import { cn } from "@/lib/utils";
import { NumberingQuickEntry } from "@/components/quote/NumberingQuickEntry";
import { LEAD_ORIGINS } from "@/lib/attribution";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { confirmAction } from "@/lib/confirmAction";


export default function QuoteForm({ 
  onSaved, 
  onBack,
  initialData,
  mode = "orcamento",
  isEditing = false
}: { 
  onSaved: (id: string) => void, 
  onBack: () => void,
  initialData?: any,
  mode?: "orcamento" | "os" | "entrega" | "recibo",
  isEditing?: boolean
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [clients, setClients] = useState<DbClient[]>([]);
  
  const [clientName, setClientName] = useState(initialData?.client?.name || "");
  const [leadOrigin, setLeadOrigin] = useState(initialData?.lead_origin || "");
  const [clientPhone, setClientPhone] = useState(initialData?.client?.phone || "");
  const [clientCnpjCpf, setClientCnpjCpf] = useState(initialData?.client?.cnpj_cpf || "");
  const [cep, setCep] = useState(initialData?.cep || initialData?.client?.cep || "");
  const [deliveryAddress, setDeliveryAddress] = useState(() => {
    // Priority: client address (logradouro) -> existing full address (part before first comma) -> empty
    if (initialData?.client?.address) return initialData.client.address;
    if (initialData?.delivery_address) {
       // Try to extract only the street if it's a full address string
       return initialData.delivery_address.split(',')[0].trim();
    }
    return "";
  });
  const [addressNumber, setAddressNumber] = useState(initialData?.address_number || initialData?.client?.address_number || "");
  const [addressComplement, setAddressComplement] = useState(initialData?.address_complement || initialData?.client?.address_complement || "");
  const [deadline, setDeadline] = useState(initialData?.deadline || "");
  const [deliveryType, setDeliveryType] = useState<"entrega" | "correios" | "retirada">(initialData?.delivery_type || "entrega");
  const [deliveryFee, setDeliveryFee] = useState(initialData?.delivery_fee?.toString() || "0");
  const [addressCopied, setAddressCopied] = useState(false);
  const [needsInstallation, setNeedsInstallation] = useState(initialData?.installation_required || false);
  const [installationFee, setInstallationFee] = useState(initialData?.installation_fee?.toString() || "0");
  const [discountAmount, setDiscountAmount] = useState(initialData?.discount_amount?.toString() || "0");
  const [discountType, setDiscountType] = useState<"fixed" | "percent">(initialData?.discount_type || "fixed");
  const [downPayment, setDownPayment] = useState(initialData?.down_payment?.toString() || "0");
  // payment_method_type may be persisted as "cartao_pedido:6x" — split base + installments
  const _pmInfo = parsePaymentMethod(initialData?.payment_method_type || "avista_pedido");
  const [paymentMethod, setPaymentMethod] = useState<string>(_pmInfo.base || "avista_pedido");
  const [installments, setInstallments] = useState<number>(_pmInfo.installments ?? 3);
  const [boletoDays, setBoletoDays] = useState<number>(_pmInfo.dueDays ?? 30);
  const [boletoInstallments, setBoletoInstallments] = useState<number>(
    _pmInfo.base === "boleto" ? (_pmInfo.installments ?? 1) : 1
  );
  
  const [items, setItems] = useState<{ productId: string, variantId?: string, name: string, price: number, originalPrice: number, quantity: number, cost: number, discount: number, discountType: "fixed" | "percent" }[]>(
    initialData?.items?.map((i: any) => ({
      productId: i.product_id,
      variantId: i.variant_id,
      name: i.product_name,
      price: i.unit_price,
      originalPrice: i.product?.price || i.unit_price, // Fallback if no product linked
      quantity: i.quantity,
      cost: i.product?.cost || 0,
      discount: i.unit_discount || 0,
      discountType: i.unit_discount_type || "fixed"
    })) || []
  );

  // Manual / custom item entry (e.g. letreiros sob medida)
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customCost, setCustomCost] = useState("");
  const [customQty, setCustomQty] = useState("1");

  // Parse números no formato BR ("1.340,50" -> 1340.5) ou US ("1340.50")
  const parseBRNumber = (v: string): number => {
    if (!v) return 0;
    const s = String(v).trim();
    // Se tem vírgula, assume BR: pontos são milhar, vírgula é decimal
    const normalized = s.includes(",")
      ? s.replace(/\./g, "").replace(",", ".")
      : s;
    const n = Number(normalized);
    return isNaN(n) ? 0 : n;
  };

  const addCustomItem = () => {
    const name = customName.trim();
    const price = parseBRNumber(customPrice);
    const cost = parseBRNumber(customCost);
    const qty = Math.max(1, Number(customQty) || 1);
    if (!name) return toast.error("Informe a descrição do serviço");
    if (!price || price <= 0) return toast.error("Informe um preço válido");
    if (cost > price) {
      return toast.error(`Custo (R$ ${cost.toFixed(2)}) maior que preço (R$ ${price.toFixed(2)}). Verifique o formato — use vírgula para decimais.`);
    }
    setItems((prev) => [
      ...prev,
      {
        productId: undefined as any,
        variantId: undefined,
        name,
        price,
        originalPrice: price,
        quantity: qty,
        cost,
        discount: 0,
        discountType: "fixed",
      },
    ]);
    toast.success(`${name} adicionado!`);
    setCustomName("");
    setCustomPrice("");
    setCustomCost("");
    setCustomQty("1");
  };


  // Auto-save logic (only if not initialData)
  useEffect(() => {
    if (initialData) return;

    const draft = localStorage.getItem("quote_draft");
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setClientName(parsed.clientName || "");
        setClientPhone(parsed.clientPhone || "");
        setClientCnpjCpf(parsed.clientCnpjCpf || "");
        setCep(parsed.cep || "");
        setDeliveryAddress(parsed.deliveryAddress || "");
        setAddressNumber(parsed.addressNumber || "");
        setAddressComplement(parsed.addressComplement || "");
        setDeadline(parsed.deadline || "");
        setDeliveryType(parsed.deliveryType || "entrega");
        setDeliveryFee(parsed.deliveryFee || "0");
        setNeedsInstallation(parsed.needsInstallation || false);
        setInstallationFee(parsed.installationFee || "0");
        setItems(parsed.items || []);
        setDownPayment(parsed.downPayment || "0");
        setPaymentMethod(parsed.paymentMethod || "avista_pedido");
      } catch (e) {
        console.error("Error loading draft", e);
        localStorage.removeItem("quote_draft");
      }
    }
  }, [initialData]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem("quote_draft", JSON.stringify({
        clientName, clientPhone, clientCnpjCpf, cep, deliveryAddress, addressNumber, addressComplement,
        deadline, deliveryType, deliveryFee, needsInstallation, installationFee, items, downPayment, paymentMethod
      }));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [clientName, clientPhone, clientCnpjCpf, cep, deliveryAddress, addressNumber, addressComplement, deadline, deliveryType, deliveryFee, needsInstallation, installationFee, items]);

  useEffect(() => {
    if (user) {
      fetchProducts(user.id).then(setProducts);
      fetchClients().then(setClients);
    }
  }, [user]);

  const visibleProducts = products.filter(p => !p.hidden);

  const handleCepSearch = async (val: string) => {
    setCep(val);
    if (val.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${val}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setDeliveryAddress(data.logradouro);
          setAddressComplement(`${data.bairro}, ${data.localidade} - ${data.uf}`);
          toast.success("Endereço encontrado!");
        }
      } catch (e) {
        console.error("CEP error", e);
      }
    }
  };

  const addItem = (p: DbProduct, variant?: any) => {
    const itemName = variant ? `${p.name} (${variant.name})` : p.name;
    const basePrice = Number(p.price) || 0;
    const adjPrice = variant ? Number(variant.price_adjustment) || 0 : 0;
    const itemPrice = basePrice + adjPrice;
    
    if (isNaN(itemPrice) || itemPrice <= 0) {
      toast.error(`O produto ${itemName} tem preço inválido (R$ ${itemPrice}) e não pode ser adicionado.`);
      return;
    }
    
    setItems((prev) => [...prev, { 
      productId: p.id, 
      variantId: variant?.id,
      name: itemName, 
      price: itemPrice, 
      originalPrice: itemPrice,
      quantity: 1, 
      cost: Number(p.cost) || 0,
      discount: 0,
      discountType: "fixed"
    }]);
    toast.success(`${itemName} adicionado!`);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((acc, item) => {
    const unitDiscount = item.discountType === "percent" 
      ? (item.originalPrice * item.discount) / 100 
      : item.discount;
    const finalUnitPrice = item.originalPrice - unitDiscount;
    return acc + (finalUnitPrice * item.quantity);
  }, 0);

  const totalCost = items.reduce((acc, item) => acc + (item.cost * item.quantity), 0);
  const profitMargin = subtotal > 0 ? ((subtotal - totalCost) / subtotal) * 100 : 0;

  const isFortaleza = addressComplement.toLowerCase().includes("fortaleza");
  const isPaidOnOrder = paymentMethod === "avista_pedido" || paymentMethod === "cartao_pedido" || paymentMethod === "sinal_entrega" || paymentMethod === "sinal_retirada";
  
  const shouldWaiveDelivery = (isPaidOnOrder && isFortaleza && deliveryType === "entrega") || deliveryType === "retirada";

  const safeDeliveryFee = shouldWaiveDelivery ? 0 : (Number(deliveryFee) || 0);
  const safeInstallationFee = needsInstallation ? (Number(installationFee) || 0) : 0;
  const safeDiscountAmount = Number(discountAmount) || 0;

  const totalBeforeGlobalDiscount = subtotal + safeDeliveryFee + safeInstallationFee;
  const globalDiscount = discountType === "percent" 
    ? (totalBeforeGlobalDiscount * safeDiscountAmount) / 100 
    : safeDiscountAmount;
  
  const total = Math.max(0, totalBeforeGlobalDiscount - globalDiscount);
  const remainingBalance = Math.max(0, total - Number(downPayment));

  const handleSave = async () => {
    if (!user) {
      toast.error("Você precisa estar logado para realizar esta ação.");
      return;
    }
    
    // Validações obrigatórias
    if (!clientName.trim()) {
      return toast.error("O nome do cliente é obrigatório");
    }
    
    if (items.length === 0) {
      return toast.error("Adicione pelo menos um item ao orçamento");
    }

    if (deliveryType !== "retirada" && !deliveryAddress.trim() && !cep.trim()) {
      return toast.error("Informe o endereço ou CEP para entrega");
    }

    if (!deadline.trim()) {
      return toast.error("Informe o prazo de entrega");
    }

    const invalidItems = items.filter(item => item.quantity <= 0);
    if (invalidItems.length > 0) {
      return toast.error("Todos os itens devem ter quantidade maior que zero");
    }

    const invalidPrices = items.filter(item => item.price <= 0);
    if (invalidPrices.length > 0) {
      return toast.error("O preço unitário de todos os itens deve ser maior que zero");
    }

    setLoading(true);
    console.log("Iniciando salvamento de orçamento...");

    try {
      // Get current employee/user data for signature
      let profile = null;
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('allowed_emails')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();
        
        if (profileError) {
          console.warn("Erro ao buscar perfil do funcionário:", profileError);
        } else {
          profile = profileData;
        }
      } catch (err) {
        console.warn("Falha silenciosa ao buscar perfil:", err);
      }

      console.log("Perfil do funcionário:", profile);

      const client = await upsertClient(user.id, { 
        name: clientName, 
        phone: clientPhone, 
        cnpj_cpf: clientCnpjCpf,
        address: deliveryAddress,
        address_number: addressNumber,
        address_complement: addressComplement,
        cep: cep,
      });

      console.log("Cliente upserted:", client);

      let fullAddress = "";
      if (deliveryType === "retirada") {
        fullAddress = "Retirada na Fábrica (Melhoraço): Av Vinte de Janeiro, 1657 - Casa 48 - Barra do Ceará, Fortaleza CE";
      } else {
        fullAddress = [deliveryAddress, addressNumber, addressComplement].filter(val => val && val.trim()).join(", ");
      }

      const quotePayload = {
        id: isEditing ? initialData?.id : undefined,
        clientId: client.id,
        leadOrigin,
        deliveryFee: Number(deliveryFee),
        deliveryRequired: deliveryType !== "retirada",
        installationFee: needsInstallation ? Number(installationFee) : 0,
        installationRequired: needsInstallation,
        deliveryAddress: fullAddress,
        deadline: deadline,
        deliveryType: deliveryType,
        employeeSignatureData: profile?.signature_url,
        employeeName: profile?.name,
        items: items.map(i => {
          const unitDiscount = i.discountType === "percent" 
            ? (i.originalPrice * i.discount) / 100 
            : i.discount;
          return {
            productId: i.productId,
            variantId: i.variantId,
            productName: i.name,
            quantity: i.quantity,
            unitPrice: Math.max(0, i.originalPrice - unitDiscount),
            unitDiscount: Number(i.discount) || 0,
            unitDiscountType: i.discountType,
            fixedCost: Number(i.cost) || 0
          };
        }),
        discountAmount: Number(discountAmount),
        discountType: discountType,
        downPayment: Number(downPayment),
        remainingBalance: remainingBalance,
        paymentMethodType: (paymentMethod === "cartao_pedido" || paymentMethod === "cartao_entrega")
          ? `${paymentMethod}:${installments}x`
          : paymentMethod === "boleto"
            ? `boleto:${boletoInstallments}x:${boletoDays}d`
            : paymentMethod

      };


      console.log("Saving full quote with payload:", quotePayload);

      const id = await saveFullQuote(user.id, quotePayload);
      
      console.log("Orçamento salvo com sucesso, ID:", id);
      
      localStorage.removeItem("quote_draft");
      toast.success(initialData?.id ? "Orçamento atualizado! 🎉" : "Orçamento gerado com sucesso! 🎉");
      await queryClient.invalidateQueries({ queryKey: ["quotes"] });
      await queryClient.refetchQueries({ queryKey: ["quotes"] });
      onSaved(id);

    } catch (e: any) {
      console.error("Erro crítico ao salvar orçamento:", e);
      toast.error(`Falha ao salvar: ${e.message || "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden space-y-6 sm:space-y-10 animate-in fade-in duration-500 pb-28 lg:pb-10">
      <header className="flex items-center gap-3 sm:gap-6">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-2xl h-11 w-11 sm:h-14 sm:w-14 bg-white shadow-sm border border-slate-100 shrink-0 min-h-[44px] min-w-[44px]">
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="font-black tracking-tight text-slate-900 truncate" style={{ fontSize: "clamp(1.125rem, 4.5vw, 1.875rem)" }}>
            {initialData?.id ? "Editar Pedido" : "Novo Pedido"}
          </h1>
          <p className="font-bold text-slate-400 uppercase tracking-widest truncate" style={{ fontSize: "clamp(0.625rem, 2vw, 0.875rem)" }}>
            {initialData?.id ? `Alterando ID: #${initialData.id.slice(0,8)}` : "Preencha os detalhes abaixo"}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 space-y-6 sm:space-y-8 min-w-0">
          <section className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-2xl shadow-slate-200/30 space-y-6 sm:space-y-8">

            <div className="flex items-center gap-3 text-primary">
               <User className="w-6 h-6" />
               <h2 className="text-lg sm:text-xl font-black tracking-tight">Dados do Cliente</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
               <div className="space-y-2 md:col-span-2">
                 <label htmlFor="lead-origin" className="label-caps">Origem do lead (opcional)</label>
                 <Select value={leadOrigin || "none"} onValueChange={value => setLeadOrigin(value === "none" ? "" : value)}>
                   <SelectTrigger id="lead-origin" className="h-12"><SelectValue placeholder="Não informada" /></SelectTrigger>
                   <SelectContent><SelectItem value="none">Não informada</SelectItem>{LEAD_ORIGINS.map(origin => <SelectItem key={origin} value={origin}>{origin}</SelectItem>)}</SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                  <label className="label-caps">Nome Completo</label>
                  <Input 
                    placeholder="Ex: João Silva" 
                    value={clientName} 
                    onChange={e => setClientName(e.target.value)} 
                    className="h-12 sm:h-14 rounded-2xl bg-slate-50 border-none font-bold text-base sm:text-lg" 
                  />
               </div>
               <div className="space-y-2">
                  <label className="label-caps">WhatsApp (Opcional)</label>
                  <Input 
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="11999998888" 
                    value={clientPhone} 
                    onChange={e => setClientPhone(e.target.value)} 
                    className="h-12 sm:h-14 rounded-2xl bg-slate-50 border-none font-bold text-base sm:text-lg" 
                  />
               </div>
               <div className="space-y-2 md:col-span-2">
                  <label className="label-caps">CPF / CNPJ (Opcional)</label>
                  <Input 
                    inputMode="numeric"
                    placeholder="000.000.000-00 ou 00.000.000/0001-00" 
                    value={clientCnpjCpf} 
                    onChange={e => setClientCnpjCpf(e.target.value)} 
                    className="h-12 sm:h-14 rounded-2xl bg-slate-50 border-none font-bold text-base sm:text-lg" 
                  />
               </div>

            </div>
          </section>

          <section className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-2xl shadow-slate-200/30 space-y-6 sm:space-y-8">
            <div className="flex items-center gap-3 text-primary">
               <Truck className="w-6 h-6" />
               <h2 className="text-lg sm:text-xl font-black tracking-tight">Logística e Instalação</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
               <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="label-caps">Tipo de Entrega</label>
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1 rounded-2xl">
                       {(["entrega", "correios", "retirada"] as const).map(type => (
                         <button
                           key={type}
                           onClick={() => setDeliveryType(type)}
                           className={cn(
                             "py-2.5 rounded-xl text-[10px] font-black uppercase transition-all min-h-[44px]",
                             deliveryType === type ? "bg-white shadow-sm text-primary" : "text-slate-400"
                           )}
                         >
                           {type}
                         </button>
                       ))}
                    </div>
                  </div>

                  {deliveryType !== "retirada" && (
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                       <label className="label-caps">Valor do Frete R$</label>
                       <Input 
                         type="number"
                         placeholder="0,00" 
                         value={deliveryFee} 
                         onChange={e => setDeliveryFee(e.target.value)} 
                         className="h-12 sm:h-14 rounded-2xl bg-slate-50 border-none font-bold" 
                       />
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                       <label className="label-caps">CEP</label>
                       <Input 
                         inputMode="numeric"
                         autoComplete="postal-code"
                         placeholder="00000000" 
                         value={cep} 
                         onChange={e => handleCepSearch(e.target.value)} 
                         className="h-12 sm:h-14 rounded-2xl bg-slate-50 border-none font-bold" 
                       />
                    </div>
                    <div className="space-y-2 col-span-2 md:col-span-3">
                       <label className="label-caps">Rua / Logradouro</label>
                       <Input 
                         placeholder="Rua, Avenida..." 
                         value={deliveryAddress} 
                         onChange={e => setDeliveryAddress(e.target.value)} 
                         className="h-12 sm:h-14 rounded-2xl bg-slate-50 border-none font-bold" 
                       />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="label-caps">Número</label>
                       <Input 
                         placeholder="123" 
                         value={addressNumber} 
                         onChange={e => setAddressNumber(e.target.value)} 
                         className="h-12 sm:h-14 rounded-2xl bg-slate-50 border-none font-bold" 
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="label-caps">Complemento</label>
                       <Input 
                         placeholder="Apto, Bloco, Casa..." 
                         value={addressComplement} 
                         onChange={e => setAddressComplement(e.target.value)} 
                         className="h-12 sm:h-14 rounded-2xl bg-slate-50 border-none font-bold" 
                       />
                    </div>
                  </div>

                  {deliveryType !== "retirada" && (() => {
                    const fullAddress = [deliveryAddress, addressNumber, addressComplement, cep]
                      .filter(v => v && v.trim()).join(", ");
                    const handleCopy = async () => {
                      if (!fullAddress.trim()) {
                        toast.error("Informe o endereço de entrega");
                        return false;
                      }
                      try {
                        await navigator.clipboard.writeText(fullAddress);
                        setAddressCopied(true);
                        toast.success("Endereço copiado!");
                        setTimeout(() => setAddressCopied(false), 2500);
                        return true;
                      } catch {
                        toast.error("Não foi possível copiar");
                        return false;
                      }
                    };
                    return (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={handleCopy}
                          className={cn(
                            "h-12 sm:h-14 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.98] border-2",
                            addressCopied
                              ? "bg-emerald-50 border-emerald-500 text-emerald-600"
                              : "bg-slate-50 border-slate-100 text-slate-600 hover:border-primary hover:text-primary"
                          )}
                        >
                          {addressCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {addressCopied ? "Copiado!" : "Copiar Endereço"}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await handleCopy();
                            if (!ok) return;
                            const nickname = clientName ? `Entrega ${clientName}` : "Entrega Melhoraço";
                            const url = `https://m.uber.com/ul/?action=setPickup&pickup=my_location` +
                              `&dropoff[formatted_address]=${encodeURIComponent(fullAddress)}` +
                              `&dropoff[nickname]=${encodeURIComponent(nickname)}` +
                              `&product_id=uber-flash`;
                            window.open(url, "_blank", "noopener,noreferrer");
                          }}
                          className="h-12 sm:h-14 rounded-2xl bg-black text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-black/90 transition-all active:scale-[0.98]"
                        >
                          <Zap className="w-4 h-4" />
                          Uber Flash
                        </button>
                      </div>
                    );
                  })()}
               </div>



               <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="label-caps">Instalação</label>
                    <button
                      onClick={() => setNeedsInstallation(!needsInstallation)}
                      className={cn(
                        "w-full h-14 rounded-2xl border-2 font-black text-sm flex items-center justify-center gap-2 transition-all",
                        needsInstallation ? "bg-primary/10 border-primary text-primary" : "border-slate-100 text-slate-300"
                      )}
                    >
                      {needsInstallation ? <CheckCircle className="w-5 h-5" /> : null}
                      {needsInstallation ? "COM INSTALAÇÃO" : "SEM INSTALAÇÃO"}
                    </button>
                  </div>

                  {needsInstallation && (
                    <div className="space-y-2 animate-in slide-in-from-top-2">
                       <label className="label-caps">Valor Instalação R$</label>
                       <Input 
                         type="number"
                         placeholder="0,00" 
                         value={installationFee} 
                         onChange={e => setInstallationFee(e.target.value)} 
                         className="h-12 sm:h-14 rounded-2xl bg-slate-50 border-none font-bold" 
                       />
                    </div>
                  )}

                  <div className="space-y-2">
                     <label className="label-caps">Prazo de Entrega</label>
                     <Input 
                       placeholder="Ex: 10 dias úteis" 
                       value={deadline} 
                       onChange={e => setDeadline(e.target.value)} 
                       className="h-12 sm:h-14 rounded-2xl bg-slate-50 border-none font-bold" 
                     />
                  </div>
               </div>
            </div>
          </section>

          <section className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-2xl shadow-slate-200/30 space-y-6 sm:space-y-8">
            <div className="flex items-center gap-3 text-primary">
               <CreditCard className="w-6 h-6" />
               <h2 className="text-lg sm:text-xl font-black tracking-tight">Opções de Pagamento</h2>
            </div>
            
            <div className="grid gap-3 sm:gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))" }}>
              {[
                { id: "avista_pedido", label: "À vista no pedido", delivery: "Fortaleza: Grátis" },
                { id: "avista_entrega", label: "À vista na entrega", delivery: "Frete normal" },
                { id: "cartao_pedido", label: `Cartão ${installments}x sem juros (no pedido)`, delivery: "Fortaleza: Grátis" },
                { id: "cartao_entrega", label: `Cartão ${installments}x sem juros (na entrega)`, delivery: "Frete normal" },
                { id: "retirada", label: "Retirada na Fábrica", delivery: "Sem frete" },
                { id: "sinal_entrega", label: "Sinal no pedido + Restante na entrega", delivery: "Frete normal" },
                { id: "sinal_retirada", label: "Sinal no pedido + Restante na retirada", delivery: "Sem frete" },
                { id: "boleto", label: boletoInstallments > 1 ? `Boleto ${boletoInstallments}x (a cada ${boletoDays}d)` : `Boleto (${boletoDays} dias)`, delivery: "Faturado para revendedor" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(opt.id);
                    if (opt.id === "retirada" || opt.id === "sinal_retirada") {
                      setDeliveryType("retirada");
                    } else {
                      if (deliveryType === "retirada") setDeliveryType("entrega");
                    }
                  }}
                  className={cn(
                    "p-4 rounded-2xl border-2 text-left transition-all flex flex-col gap-1 min-h-[44px] active:scale-[0.98]",
                    paymentMethod === opt.id ? "border-primary bg-primary/5 shadow-md" : "border-slate-100 hover:border-slate-200"
                  )}
                >
                  <span className={cn("font-black text-sm", paymentMethod === opt.id ? "text-primary" : "text-slate-700")}>{opt.label}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{opt.delivery}</span>
                </button>
              ))}
            </div>

            {(paymentMethod === "cartao_pedido" || paymentMethod === "cartao_entrega") && (
              <div className="pt-4 border-t border-dashed animate-in fade-in slide-in-from-top-4 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <label className="label-caps mb-0">Número de parcelas</label>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400">Valor da parcela</p>
                    <p className="text-xl font-black text-primary tabular">
                      {installments}x de {formatCurrency(total / Math.max(1, installments))}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setInstallments(n)}
                      className={cn(
                        "h-10 rounded-lg text-xs font-black tabular transition-all",
                        installments === n
                          ? "bg-primary text-white shadow-md scale-105"
                          : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                      )}
                    >
                      {n}x
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-bold text-slate-400">
                  Cliente pode escolher de 1 a 12x. Sem juros (absorvidos pela loja).
                </p>
              </div>
            )}

            {paymentMethod === "boleto" && (
              <div className="pt-4 border-t border-dashed animate-in fade-in slide-in-from-top-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <label className="label-caps mb-0">Intervalo entre boletos</label>
                    <p className="text-xl font-black text-primary tabular">{boletoDays} dias</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[20, 30].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setBoletoDays(d)}
                        className={cn(
                          "h-12 rounded-lg text-sm font-black tabular transition-all",
                          boletoDays === d
                            ? "bg-primary text-white shadow-md scale-105"
                            : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                        )}
                      >
                        a cada {d} dias
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <label className="label-caps mb-0">Parcelas (faturado)</label>
                    <p className="text-xl font-black text-primary tabular">{boletoInstallments}x</p>
                  </div>
                  <div className="grid grid-cols-6 gap-2 mt-2">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setBoletoInstallments(n)}
                        className={cn(
                          "h-10 rounded-lg text-sm font-black tabular transition-all",
                          boletoInstallments === n
                            ? "bg-primary text-white shadow-md scale-105"
                            : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                        )}
                      >
                        {n}x
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[10px] font-bold text-slate-400">
                  {boletoInstallments > 1
                    ? `Faturado em ${boletoInstallments}x com vencimentos a cada ${boletoDays} dias (1º boleto em ${boletoDays} dias).`
                    : `Boleto único com vencimento em ${boletoDays} dias.`}
                </p>
              </div>
            )}




            {(paymentMethod === "sinal_entrega" || paymentMethod === "sinal_retirada") && (
              <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-dashed animate-in fade-in slide-in-from-top-4">
                 <div className="space-y-2">
                    <label className="label-caps">Valor de Sinal (R$)</label>
                    <Input 
                      type="number"
                      placeholder="0,00" 
                      value={downPayment} 
                      onChange={e => setDownPayment(e.target.value)} 
                      className="h-12 sm:h-14 rounded-2xl bg-slate-50 border-none font-bold text-base sm:text-lg" 
                    />
                    <p className="text-xs text-slate-400 font-medium">Valor pago no ato da aprovação</p>
                 </div>
                 <div className="space-y-2">
                    <label className="label-caps">Restante na {paymentMethod === "sinal_entrega" ? "Entrega" : "Retirada"} (R$)</label>
                    <div className="h-14 rounded-2xl bg-slate-100/50 flex items-center px-4 font-black text-lg text-slate-600">
                      {formatCurrency(remainingBalance)}
                    </div>
                    <p className="text-xs text-slate-400 font-medium">Calculado automaticamente</p>
                 </div>
              </div>
            )}
          </section>

          <section className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-2xl shadow-slate-200/30 space-y-6 sm:space-y-8">
            <div className="flex justify-between items-center border-b pb-4">
               <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">Produtos do Pedido</h2>
               <span className="text-[10px] font-black px-4 py-1.5 bg-slate-100 rounded-full text-slate-500 uppercase tracking-widest">{items.length} Itens selecionados</span>
            </div>
            
            <div className="space-y-4">
              {(() => {
                const grouped = groupQuoteItems(items.map((item, idx) => ({
                  ...item,
                  product_id: item.productId,
                  variant_id: item.variantId,
                  product_name: item.name,
                  unit_price: item.price,
                  originalIdx: idx
                })));

                return grouped.map((group, gIdx) => (
                  <div key={gIdx} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center group bg-slate-50/50 rounded-2xl border border-transparent hover:border-primary/20 transition-all gap-4">
                    <div className="flex items-center gap-4 flex-1">
                       <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary font-black shadow-sm shrink-0">
                          {gIdx + 1}
                       </div>
                       <div className="flex-1">
                          {!group.product_id ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">Manual</span>
                              </div>
                              <Input
                                value={group.mainName}
                                onChange={(e) => {
                                  const newName = e.target.value;
                                  const newItems = [...items];
                                  group.indices.forEach((idx: number) => { newItems[idx].name = newName; });
                                  setItems(newItems);
                                }}
                                className="h-9 rounded-lg bg-white border border-slate-200 font-black text-sm text-slate-900"
                              />
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400">R$</span>
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  value={items[group.indices[0]].originalPrice || ""}
                                  onChange={(e) => {
                                    const v = Number(e.target.value) || 0;
                                    const newItems = [...items];
                                    group.indices.forEach((idx: number) => {
                                      newItems[idx].originalPrice = v;
                                      newItems[idx].price = v;
                                    });
                                    setItems(newItems);
                                  }}
                                  className="h-9 w-28 rounded-lg bg-white border border-slate-200 font-black text-sm text-primary text-right"
                                />
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="font-black text-slate-900 leading-tight">
                                {group.mainName}
                                {group.details.length > 0 && (
                                  <span className="text-primary ml-2 font-black">({group.details.join('')})</span>
                                )}
                              </p>
                              <div className="flex flex-col">
                                <p className={cn("text-sm font-bold", group.unitPrice <= 0 ? "text-red-500" : "text-primary")}>
                                  {formatCurrency(group.unitPrice)}
                                </p>
                                {group.unitPrice <= 0 && (
                                  <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter">Preço Inválido!</span>
                                )}
                              </div>
                            </>
                          )}
                          
                          {group.details.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {group.details.map((v, vIdx) => (
                                <span 
                                  key={vIdx} 
                                  className="px-2 py-1 bg-white border border-slate-100 rounded-lg text-[10px] font-black text-slate-500 flex items-center gap-1 group/var"
                                >
                                  {v}
                                  <button 
                                    onClick={() => {
                                      // Encontrar o item original e remover
                                      const originalItem = items.find(it => it.name.includes(`(${v})`) && it.productId === group.product_id);
                                      if (originalItem) {
                                        setItems(items.filter(it => it !== originalItem));
                                      }
                                    }}
                                    className="hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                       </div>
                    </div>
                    <div className="flex flex-col md:flex-row items-end md:items-center gap-4 self-end md:self-auto">
                      <div className="flex flex-col gap-1 items-end">
                        <div className="flex bg-white rounded-lg p-0.5 border shadow-sm">
                          <button 
                            onClick={() => {
                              const newItems = [...items];
                              group.indices.forEach((idx: number) => newItems[idx].discountType = "fixed");
                              setItems(newItems);
                            }}
                            className={cn("px-2 py-1 text-[8px] font-black rounded-md transition-all", items[group.indices[0]].discountType === "fixed" ? "bg-slate-100 text-primary" : "text-slate-400")}
                          >R$</button>
                          <button 
                            onClick={() => {
                              const newItems = [...items];
                              group.indices.forEach((idx: number) => newItems[idx].discountType = "percent");
                              setItems(newItems);
                            }}
                            className={cn("px-2 py-1 text-[8px] font-black rounded-md transition-all", items[group.indices[0]].discountType === "percent" ? "bg-slate-100 text-primary" : "text-slate-400")}
                          > % </button>
                        </div>
                        <Input 
                          type="number"
                          placeholder="Desc."
                          value={items[group.indices[0]].discount || ""}
                          onChange={(e) => {
                            const newItems = [...items];
                            group.indices.forEach((idx: number) => newItems[idx].discount = Number(e.target.value));
                            setItems(newItems);
                          }}
                          className="w-20 h-8 rounded-lg bg-white border border-slate-100 text-[10px] font-black text-right"
                        />
                      </div>

                      <div className="flex items-center bg-white rounded-xl p-1 shadow-sm border">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => {
                          const newItems = [...items];
                          // Diminuir quantidade do último item adicionado neste grupo
                          const lastIdx = group.indices[group.indices.length - 1];
                          newItems[lastIdx].quantity = Math.max(1, newItems[lastIdx].quantity - 1);
                          setItems(newItems);
                        }}>-</Button>
                        <span className="w-10 text-center font-black text-slate-900">{group.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-primary" onClick={() => {
                          const newItems = [...items];
                          const lastIdx = group.indices[group.indices.length - 1];
                          newItems[lastIdx].quantity += 1;
                          setItems(newItems);
                        }}>+</Button>
                      </div>
                      <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-300 hover:text-red-500 transition-colors" onClick={() => {
                        // Remover todos os itens deste grupo
                        const indicesToRemove = new Set(group.indices);
                        setItems(items.filter((_, i) => !indicesToRemove.has(i)));
                      }}>
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                ));
              })()}
              
              {items.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed rounded-3xl text-slate-400 font-bold">
                   Nenhum item adicionado ainda. Escolha no catálogo ao lado.
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="lg:col-span-1 space-y-8">
           <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-2xl shadow-slate-200/30 space-y-6 lg:sticky lg:top-10">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 border-b pb-4 flex justify-between items-center">
                Catálogo Rápido
                <span className="text-[10px] lowercase font-normal italic">({visibleProducts.length} visíveis)</span>
              </h2>

              {/* Item manual / serviço personalizado */}
              <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-3 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                  + Item Manual / Serviço
                </p>
                <Input
                  placeholder='Ex: "Letreiro em aço inox 80cm"'
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="h-10 rounded-xl bg-white border-none font-bold text-sm"
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="Preço R$"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="h-10 rounded-xl bg-white border-none font-bold text-sm flex-1"
                  />
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="CMV R$"
                    value={customCost}
                    onChange={(e) => setCustomCost(e.target.value)}
                    className="h-10 rounded-xl bg-white border-none font-bold text-sm flex-1"
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="Qtd"
                    value={customQty}
                    onChange={(e) => setCustomQty(e.target.value)}
                    className="h-10 rounded-xl bg-white border-none font-bold text-sm w-16 text-center"
                  />
                  <button
                    type="button"
                    onClick={addCustomItem}
                    className="h-10 px-4 rounded-xl bg-primary text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-[0.98] transition-all"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                <p className="text-[9px] font-bold text-slate-400">
                  Use para itens fora do catálogo (letreiros, placas, projetos sob medida). CMV é opcional e entra no custo da DRE.
                </p>
              </div>


              <div className="grid gap-3 max-h-[60vh] lg:max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
                 {visibleProducts.map(p => (
                   <div key={p.id} className="space-y-2">
                     <div className="flex gap-2">
                       <button 
                        onClick={() => addItem(p)}
                        className="flex-1 p-4 flex items-center justify-between rounded-2xl bg-slate-50 hover:bg-primary/5 hover:border-primary/20 border-2 border-transparent transition-all group text-left"
                       >
                         <div className="flex-1">
                            <p className="font-black text-slate-900 text-sm leading-tight group-hover:text-primary transition-colors">{p.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatCurrency(p.price)}</p>
                         </div>
                         <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm border group-hover:bg-primary group-hover:text-white transition-all">
                            <Plus className="w-4 h-4" />
                         </div>
                       </button>
                       <button 
                        onClick={async () => {
                          if (await confirmAction({ title: `Ocultar ${p.name} do catálogo rápido?`, confirmLabel: "Ocultar" })) {
                            try {
                              await hideProduct(p.id, true);
                              setProducts(products.map(item => item.id === p.id ? { ...item, hidden: true } : item));
                              toast.success("Produto ocultado");
                            } catch (e: any) {
                              toast.error("Erro ao ocultar: " + e.message);
                            }
                          }
                        }}
                        title="Ocultar do catálogo"
                        className="w-10 flex items-center justify-center rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-300 hover:text-slate-600 transition-all border-2 border-transparent"
                       >
                         <EyeOff className="w-4 h-4" />
                       </button>
                       <button 
                        onClick={async () => {
                          if (await confirmAction({ title: `Excluir ${p.name} do catálogo?`, description: "O produto some do catálogo. Pedidos antigos continuam com o histórico.", confirmLabel: "Excluir", destructive: true })) {
                            try {
                              await deleteProduct(p.id);
                              setProducts(products.filter(item => item.id !== p.id));
                              toast.success("Produto removido do catálogo");
                            } catch (e: any) {
                              toast.error("Erro ao excluir: " + e.message);
                            }
                          }
                        }}
                        title="Excluir permanentemente"
                        className="w-10 flex items-center justify-center rounded-2xl bg-slate-50 hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all border-2 border-transparent"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>

                     
                      {p.variants && p.variants.length > 0 && /15\s*cm/i.test(p.name) && (
                        <NumberingQuickEntry
                          variants={p.variants as any}
                          madeToOrder={p.made_to_order}
                          onAdd={(v) => addItem(p, v)}
                        />
                      )}

                      {false && p.variants && p.variants.length > 0 && (
                        <div className="pl-4 space-y-1">
                          {p.variants.map(v => (
                            <div key={v.id} className="flex gap-1">
                              <button 
                               onClick={() => addItem(p, v)}
                               className="flex-1 p-2.5 flex items-center justify-between rounded-xl bg-slate-100/50 hover:bg-primary/5 hover:border-primary/10 border border-transparent transition-all group text-left"
                              >
                                <div className="flex-1">
                                   <p className="font-bold text-slate-700 text-[11px] leading-tight group-hover:text-primary transition-colors">{v.name}</p>
                                   <p className="text-[9px] font-bold text-slate-400">+{formatCurrency(v.price_adjustment)}</p>
                                </div>
                                <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-primary shadow-sm border group-hover:bg-primary group-hover:text-white transition-all">
                                   <Plus className="w-3 h-3" />
                                </div>
                              </button>
                              <button 
                                onClick={async () => {
                                  if (await confirmAction({ title: `Excluir variação ${v.name}?`, confirmLabel: "Excluir", destructive: true })) {
                                    try {
                                      await deleteProductVariant(v.id);
                                      // Update local state by refetching or filtering
                                      setProducts(products.map(prod => {
                                        if (prod.id === p.id) {
                                          return {
                                            ...prod,
                                            variants: prod.variants?.filter(varItem => varItem.id !== v.id)
                                          };
                                        }
                                        return prod;
                                      }));
                                      toast.success("Variação removida");
                                    } catch (e: any) {
                                      toast.error("Erro ao excluir: " + e.message);
                                    }
                                  }
                                }}
                                className="w-8 flex items-center justify-center rounded-xl bg-slate-100/50 hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>

                     )}
                   </div>
                 ))}
                 {products.length === 0 && <p className="text-xs text-slate-400 text-center font-bold">Nenhum produto cadastrado.</p>}
              </div>

               <div className="pt-6 border-t border-slate-100 space-y-4">
                  <div className="space-y-2">
                     <div className="flex justify-between items-center">
                       <label className="label-caps">Desconto Geral</label>
                       <div className="flex bg-slate-100 rounded-lg p-0.5">
                         <button 
                           type="button"
                           onClick={() => setDiscountType("fixed")}
                           className={cn("px-2 py-1 text-[9px] font-black rounded-md transition-all", discountType === "fixed" ? "bg-white shadow-sm text-primary" : "text-slate-400")}
                         >R$</button>
                         <button 
                           type="button"
                           onClick={() => setDiscountType("percent")}
                           className={cn("px-2 py-1 text-[9px] font-black rounded-md transition-all", discountType === "percent" ? "bg-white shadow-sm text-primary" : "text-slate-400")}
                         >%</button>
                       </div>
                     </div>
                     <Input 
                       type="number"
                       placeholder="0" 
                       value={discountAmount} 
                       onChange={e => setDiscountAmount(e.target.value)} 
                       className="h-12 rounded-xl bg-slate-50 border-none font-bold text-right pr-4" 
                     />
                  </div>

                  <div className="space-y-2 pt-2 border-t border-dashed">
                     <label className="label-caps">Sinal (Down Payment) R$</label>
                     <Input 
                       type="number"
                       placeholder="0,00" 
                       value={downPayment} 
                       onChange={e => setDownPayment(e.target.value)} 
                       className="h-12 rounded-xl bg-primary/5 border-none font-black text-right pr-4 text-primary" 
                     />
                     <div className="flex justify-between items-center px-1">
                       <p className="text-[10px] font-bold text-slate-400">RESTANTE:</p>
                       <p className="text-[10px] font-black text-slate-600">{formatCurrency(remainingBalance)}</p>
                     </div>
                  </div>

                  <div className="flex justify-between items-end pt-4">
                     <div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Margem Est.</p>
                       <p className={cn("text-sm font-black", profitMargin > 30 ? "text-green-500" : "text-orange-500")}>{profitMargin.toFixed(1)}%</p>
                     </div>
                     <div className="text-right">
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Investimento Total</p>
                       <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight break-words">{formatCurrency(total)}</p>
                     </div>
                  </div>
                  <Button 
                    onClick={handleSave} 
                    disabled={loading} 
                    className="hidden lg:flex w-full h-16 sm:h-20 rounded-[2rem] font-black text-lg sm:text-xl shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all gap-3"
                  >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                    {initialData?.id ? "ATUALIZAR PEDIDO" : "GERAR ORÇAMENTO"}
                  </Button>
               </div>

           </div>
        </div>
      </div>

      {/* Sticky mobile action bar — sits above BottomNav using safe-area inset */}
      <div className="lg:hidden fixed left-0 right-0 z-40 px-3 pointer-events-none" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 4.5rem)" }}>
        <div className="pointer-events-auto mx-auto max-w-xl rounded-2xl bg-white/95 backdrop-blur border border-slate-100 shadow-2xl shadow-slate-900/10 p-2.5 flex items-center gap-3">
          <div className="flex-1 min-w-0 pl-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none">Total</p>
            <p className="text-base font-black text-slate-900 truncate">{formatCurrency(total)}</p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={loading} 
            className="h-12 px-5 rounded-xl font-black text-sm shadow-lg shadow-primary/30 active:scale-[0.98] transition-all gap-2 min-h-[44px]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {initialData?.id ? "ATUALIZAR" : "GERAR"}
          </Button>
        </div>
      </div>
    </div>
  );
}
