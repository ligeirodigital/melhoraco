import { CatalogFields, emptyCatalogFields } from "@/components/catalog/CatalogFields";
import { appUrl } from "@/lib/appUrl";
import { CatalogManager } from "@/components/catalog/CatalogManager";
import { useState, useEffect, useMemo } from "react";
import { DbProduct, fetchProducts, supabase, upsertBusinessSettings } from "@/lib/cloudStore";
import { BUCKETS } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProjectData } from "@/hooks/useProjectData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Package, 
  Tag, 
  Layers, 
  Settings as SettingsIcon,
  Calculator,
  Percent,
  TrendingUp,
  Coins,
  DollarSign,
  Users,
  Mail,
  UserPlus,
  ShieldCheck,
  Ban,
  Clock,
  RefreshCw,
  Image as ImageIcon,
  Upload,
  Edit2,
  Check,
  X,
  Moon,
  Sun,
  LayoutGrid,
  ExternalLink,
  Copy,
  Zap,
  ArrowRight, 
  Loader2, 
  Info, 
  CreditCard, 
  Wallet,
  User,
  HardDrive,
  Gift
} from "lucide-react";
import { BackupsPanel } from "@/components/BackupsPanel";
import { ReferralsPanel } from "@/components/ReferralsPanel";

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatQuote";
import { MainLayout } from "@/components/MainLayout";
import { cn } from "@/lib/utils";
import { confirmAction } from "@/lib/confirmAction";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";


const LandingPagesManager = () => {
  const { user } = useAuth();
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [selectedPageLeads, setSelectedPageLeads] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  const loadLeads = async (pageId: string) => {
    setLoadingLeads(true);
    const { data } = await supabase
      .from("quiz_leads")
      .select("*")
      .eq("landing_page_id", pageId)
      .order("created_at", { ascending: false });
    if (data) setLeads(data);
    setLoadingLeads(false);
  };

  useEffect(() => {
    if (selectedPageLeads) {
      loadLeads(selectedPageLeads.id);
    }
  }, [selectedPageLeads]);

  const loadPages = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("landing_pages")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setPages(data);
    setLoading(false);
  };

  useEffect(() => { loadPages(); }, [user]);

  const createInitialPage = async () => {
    if (!user) return;
    setLoading(true);
    const slug = `venda-${Math.random().toString(36).slice(2, 7)}`;
    const { data, error } = await supabase.from("landing_pages").insert({
      user_id: user.id,
      title: "Números em Aço Inox 15cm",
      headline: "Números em Inox 15cm com Qualidade Premium",
      subheadline: "Fabricados em inox AISI 304, resistentes à chuva, sol e ferrugem. Entrega grátis em Fortaleza via Uber Flash.",
      slug,
      price: 59,
      original_price: 90,
      whatsapp_number: "5585999999999",
      is_active: true,
      page_type: 'standard'
    }).select().single();
    
    if (error) toast.error("Erro ao criar página");
    else {
      toast.success("Página de vendas criada!");
      loadPages();
      setEditingPage(data);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("landing_pages")
      .update({ is_active: !current })
      .eq("id", id);
    if (!error) loadPages();
  };

  const deletePage = async (id: string) => {
    if (!(await confirmAction({ title: "Excluir esta página?", description: "A página deixa de estar disponível para os clientes.", confirmLabel: "Excluir", destructive: true }))) return;
    const { error } = await supabase.from("landing_pages").delete().eq("id", id);
    if (!error) {
      toast.success("Página excluída");
      loadPages();
    }
  };

  const savePage = async () => {
    if (!editingPage) return;
    setSaving(true);
    const { error } = await supabase
      .from("landing_pages")
      .update({
        title: editingPage.title,
        headline: editingPage.headline,
        subheadline: editingPage.subheadline,
        price: editingPage.price,
        original_price: editingPage.original_price,
        whatsapp_number: editingPage.whatsapp_number,
        hero_image_url: editingPage.hero_image_url,
        slug: editingPage.slug,
        page_type: editingPage.page_type,
        meta_pixel_id: editingPage.meta_pixel_id,
        google_tag_id: editingPage.google_tag_id
      })
      .eq("id", editingPage.id);

    if (error) toast.error("Erro ao salvar: " + error.message);
    else {
      toast.success("Alterações salvas com sucesso!");
      setEditingPage(null);
      loadPages();
    }
    setSaving(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !editingPage) return;
    
    const fileExt = file.name.split('.').pop();
    const filePath = `lp/${editingPage.id}-${Math.random()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from(BUCKETS.lpImages)
      .upload(filePath, file);
      
    if (uploadError) return toast.error("Erro no upload");
    
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKETS.lpImages)
      .getPublicUrl(filePath);
      
    setEditingPage({...editingPage, hero_image_url: publicUrl});
    toast.success("Imagem carregada!");
  };

  const copyLink = (slug: string) => {
    const url = `${appUrl()}/p/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  return (
    <div className="bg-card p-10 rounded-[3rem] border border-border shadow-2xl shadow-black/5 space-y-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <Zap className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tighter text-foreground">Landing Pages</h2>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Páginas de alta conversão editáveis</p>
          </div>
        </div>
        {!editingPage && (
          <Button onClick={createInitialPage} className="rounded-2xl h-12 px-6 font-black gap-2">
            <Plus className="w-5 h-5" /> NOVA PÁGINA
          </Button>
        )}
      </div>

      {editingPage ? (
        <div className="space-y-8 animate-in fade-in zoom-in-95">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="label-caps">Título Interno</label>
                  <Input value={editingPage.title} onChange={e => setEditingPage({...editingPage, title: e.target.value})} className="rounded-xl h-12 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="label-caps">Tipo de Página</label>
                  <Select 
                    value={editingPage.page_type || 'standard'} 
                    onValueChange={(val) => setEditingPage({...editingPage, page_type: val})}
                  >
                    <SelectTrigger className="rounded-xl h-12 font-bold bg-muted border-none">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Padrão (Vitrine)</SelectItem>
                      <SelectItem value="quiz">Quiz (Passo a Passo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="label-caps">Headline (Título da Página)</label>
                <Input value={editingPage.headline} onChange={e => setEditingPage({...editingPage, headline: e.target.value})} className="rounded-xl h-12 font-bold" />
              </div>
              <div className="space-y-2">
                <label className="label-caps">Subheadline (Descrição)</label>
                <textarea 
                  value={editingPage.subheadline} 
                  onChange={e => setEditingPage({...editingPage, subheadline: e.target.value})} 
                  className="w-full rounded-xl p-4 bg-muted border-none font-bold text-sm min-h-[100px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="label-caps">Preço Oferta</label>
                  <Input type="number" value={editingPage.price} onChange={e => setEditingPage({...editingPage, price: Number(e.target.value)})} className="rounded-xl h-12 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="label-caps">Preço Original</label>
                  <Input type="number" value={editingPage.original_price} onChange={e => setEditingPage({...editingPage, original_price: Number(e.target.value)})} className="rounded-xl h-12 font-bold" />
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="label-caps">WhatsApp (com DDD)</label>
                <Input value={editingPage.whatsapp_number} onChange={e => setEditingPage({...editingPage, whatsapp_number: e.target.value})} className="rounded-xl h-12 font-bold" />
              </div>
              <div className="space-y-2">
                <label className="label-caps">Slug (URL amigável)</label>
                <Input value={editingPage.slug} onChange={e => setEditingPage({...editingPage, slug: e.target.value})} className="rounded-xl h-12 font-bold" />
              </div>
              <div className="space-y-4">
                <label className="label-caps">Imagem Principal</label>
                <div className="aspect-video bg-muted rounded-2xl flex items-center justify-center relative overflow-hidden group border-2 border-dashed border-border">
                  {editingPage.hero_image_url ? (
                    <img src={editingPage.hero_image_url} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
                  )}
                  <label className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 transition-all text-white font-bold">
                    <Upload className="w-6 h-6 mr-2" /> UPLOAD
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-muted/50 p-8 rounded-[2rem] border border-border/50 space-y-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-black tracking-tighter">Rastreamento e Ads</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="label-caps">ID do Pixel do Meta (Facebook)</label>
                <Input 
                  placeholder="Ex: 123456789012345" 
                  value={editingPage.meta_pixel_id || ''} 
                  onChange={e => setEditingPage({...editingPage, meta_pixel_id: e.target.value})} 
                  className="rounded-xl h-12 font-bold" 
                />
                <p className="text-[10px] text-muted-foreground font-medium">Apenas o ID numérico do seu Pixel.</p>
              </div>
              <div className="space-y-2">
                <label className="label-caps">ID da Tag do Google (GTM/GA4)</label>
                <Input 
                  placeholder="Ex: G-XXXXXXXXXX ou AW-XXXXXXXXXX" 
                  value={editingPage.google_tag_id || ''} 
                  onChange={e => setEditingPage({...editingPage, google_tag_id: e.target.value})} 
                  className="rounded-xl h-12 font-bold" 
                />
                <p className="text-[10px] text-muted-foreground font-medium">O ID de acompanhamento do Google Tag Manager ou GA4.</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4 pt-6 border-t">
            <Button variant="outline" onClick={() => setEditingPage(null)} className="h-14 px-8 rounded-2xl font-bold">CANCELAR</Button>
            <Button onClick={savePage} disabled={saving} className="h-14 px-12 rounded-2xl font-black flex-1 shadow-lg shadow-primary/20">
              {saving ? <Loader2 className="animate-spin" /> : "SALVAR ALTERAÇÕES"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          <Dialog open={!!selectedPageLeads} onOpenChange={(open) => !open && setSelectedPageLeads(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto rounded-[2rem]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tighter">
                  Leads de: {selectedPageLeads?.title}
                </DialogTitle>
              </DialogHeader>
              
              <div className="mt-6">
                {loadingLeads ? (
                  <div className="flex justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  </div>
                ) : leads.length > 0 ? (
                  <div className="space-y-4">
                    {leads.map(lead => (
                      <div key={lead.id} className="bg-muted/30 p-6 rounded-2xl border border-border/50 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-black text-lg">{lead.first_name} {lead.last_name}</h4>
                            <p className="text-sm font-bold text-primary">{lead.whatsapp}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-black">{formatCurrency(lead.total_value)}</p>
                            <p className="text-[10px] font-black uppercase text-muted-foreground">{new Date(lead.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 text-xs">
                          <div className="space-y-1">
                            <p className="font-black uppercase tracking-widest text-[8px] text-muted-foreground">Pedido</p>
                            <p className="font-bold">Qtd: {lead.quantity} | Números: {lead.desired_number}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="font-black uppercase tracking-widest text-[8px] text-muted-foreground">Endereço</p>
                            <p className="font-bold">{lead.street}, {lead.number} - {lead.neighborhood}</p>
                            <p className="font-bold text-muted-foreground">{lead.city} - CEP: {lead.cep}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-muted/20 rounded-[2rem] border-2 border-dashed border-border/50">
                    <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                    <p className="text-muted-foreground font-bold">Nenhum lead capturado ainda.</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : pages.length > 0 ? (
            pages.map(page => (
              <div key={page.id} className="group bg-muted/30 p-8 rounded-[2rem] border border-border/50 hover:border-primary/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                   <div className="w-20 h-20 bg-muted rounded-2xl overflow-hidden shadow-inner flex items-center justify-center text-muted-foreground/20">
                      {page.hero_image_url ? <img src={page.hero_image_url} className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8" />}
                   </div>
                   <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-black tracking-tight">{page.title}</h3>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        page.is_active ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                      )}>
                        {page.is_active ? "Ativa" : "Pausada"}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">/p/{page.slug}</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  {page.page_type === 'quiz' && (
                    <Button variant="outline" size="sm" onClick={() => setSelectedPageLeads(page)} className="rounded-xl font-bold gap-2 h-10 bg-primary/5 text-primary border-primary/20 hover:bg-primary/10">
                      <Users className="w-4 h-4" /> Leads
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => copyLink(page.slug)} className="rounded-xl font-bold gap-2 h-10">
                    <Copy className="w-4 h-4" /> Link
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditingPage(page)} className="rounded-xl font-bold gap-2 h-10">
                    <Edit2 className="w-4 h-4" /> Editar
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm" 
                    onClick={() => toggleActive(page.id, page.is_active)}
                    className={cn("rounded-xl font-bold h-10", page.is_active ? "text-red-500" : "text-green-500")}
                  >
                    {page.is_active ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deletePage(page.id)} className="rounded-xl font-bold h-10 text-red-400 hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-muted/20 rounded-[2rem] border-2 border-dashed border-border/50">
              <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <p className="text-muted-foreground font-bold">Nenhuma página de vendas personalizada.</p>
              <p className="text-xs font-medium text-muted-foreground/60 mt-1">Clique em "Nova Página" para configurar sua primeira LP.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { settings, salesTargets, mutations, quotes, activityLogs } = useProjectData();
  
  const [activeTab, setActiveTab] = useState<string>("branding");

  const [products, setProducts] = useState<DbProduct[]>([]);
  
  // New Product State
  const [newCatalog, setNewCatalog] = useState(emptyCatalogFields);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCost, setNewCost] = useState("");
  const [newStock, setNewStock] = useState("");
  const [newMinStock, setNewMinStock] = useState("5");
  const [nubankPixKey, setNubankPixKey] = useState("");
  const [nubankPixName, setNubankPixName] = useState("");
  const [infinitypayHandle, setInfinitypayHandle] = useState("");
  const [infinitypaySandbox, setInfinitypaySandbox] = useState(false);
  const [loading, setLoading] = useState(false);

  // New Variant State
  const [newVariantName, setNewVariantName] = useState("");
  const [newVariantPriceAdj, setNewVariantPriceAdj] = useState("0");
  const [newVariantStock, setNewVariantStock] = useState("0");
  const [newVariantMinStock, setNewVariantMinStock] = useState("5");
  const [selectedProductIdForVariant, setSelectedProductIdForVariant] = useState<string | null>(null);

  // Financial Settings State
  const [taxRate, setTaxRate] = useState("");
  const [monthlyExpenses, setMonthlyExpenses] = useState("");
  const [profitsDistribution, setProfitsDistribution] = useState("");
  const [monthlyTarget, setMonthlyTarget] = useState("");
  const [manualBalance, setManualBalance] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Employee State
  const [allowedEmails, setAllowedEmails] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newNameEmployee, setNewNameEmployee] = useState("");
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [editEmailValue, setEditEmailValue] = useState("");

  const approvedQuotes = useMemo(() => 
    quotes.data?.filter(q => q.status === "aprovado") || [], 
    [quotes.data]
  );

  const breakEvenPoint = useMemo(() => {
    if (!approvedQuotes.length || !settings.data) return 0;
    
    const totalRevenue = approvedQuotes.reduce((acc, q) => {
      return acc + q.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    }, 0);

    const totalCost = approvedQuotes.reduce((acc, q) => {
      return acc + q.items.reduce((sum, item) => sum + ((Number(item.fixed_cost) || Number(item.product?.cost) || 0) * item.quantity), 0);
    }, 0);

    const grossProfit = totalRevenue - totalCost - (totalRevenue * (settings.data.tax_rate / 100));
    const margin = grossProfit / totalRevenue;

    if (margin <= 0) return 0;
    return settings.data.monthly_expenses / margin;
  }, [approvedQuotes, settings.data]);

  const load = () => {
    if (user) fetchProducts(user.id).then(setProducts);
  };

  useEffect(load, [user]);

  useEffect(() => {
    if (settings.data) {
      setTaxRate(settings.data.tax_rate.toString());
      setMonthlyExpenses(settings.data.monthly_expenses.toString());
      setProfitsDistribution((settings.data as any).profits_distribution?.toString() || "0");
      setLogoUrl(settings.data.logo_url || null);
      setNubankPixKey((settings.data as any).nubank_pix_key || "");
      setNubankPixName((settings.data as any).nubank_pix_name || "");
      setManualBalance((settings.data as any).manual_balance?.toString() || "0");
      // Prioriza valor persistido no banco; fallback para localStorage (compatibilidade)
      const dbHandle = (settings.data as any).infinitypay_handle;
      const dbSandbox = (settings.data as any).infinitypay_sandbox;
      if (dbHandle != null) setInfinitypayHandle(dbHandle || "");
      if (dbSandbox != null) setInfinitypaySandbox(Boolean(dbSandbox));
    }
  }, [settings.data]);

  useEffect(() => {
    if (user && !settings.data) {
      setInfinitypayHandle(localStorage.getItem(`infinitypay_handle_${user.id}`) || "");
      setInfinitypaySandbox(localStorage.getItem(`infinitypay_sandbox_${user.id}`) === "1");
    }
  }, [user, settings.data]);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (salesTargets.data) {
      const target = salesTargets.data.find(t => t.month === currentMonth && t.year === currentYear);
      if (target) setMonthlyTarget(target.target_amount.toString());
    }
  }, [salesTargets.data, currentMonth, currentYear]);

  const addProduct = async () => {
    if (!user || !newName || !newPrice) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("products").insert({
        user_id: user.id,
        name: newName,
        ...newCatalog,
        price: Number(newPrice),
        cost: Number(newCost) || 0,
        category: "Geral",
        editable: false,
        sort_order: products.length,
        stock_quantity: Number(newStock) || 0,
        min_stock_level: Number(newMinStock) || 5
      });
      if (error) throw error;
      toast.success("Produto adicionado com sucesso!");
      setNewCatalog(emptyCatalogFields);
      setNewName("");
      setNewPrice("");
      setNewCost("");
      setNewStock("");
      setNewMinStock("5");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!(await confirmAction({ title: "Remover este produto do catálogo?", confirmLabel: "Remover", destructive: true }))) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Produto removido");
      load();
    }
  };

  const addVariant = async () => {
    if (!selectedProductIdForVariant || !newVariantName) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("product_variants").insert({
        product_id: selectedProductIdForVariant,
        name: newVariantName,
        price_adjustment: Number(newVariantPriceAdj) || 0,
        stock_quantity: Number(newVariantStock) || 0,
        min_stock_level: Number(newVariantMinStock) || 5
      });
      if (error) throw error;
      toast.success("Subproduto adicionado!");
      setNewVariantName("");
      setNewVariantPriceAdj("0");
      setNewVariantStock("0");
      setNewVariantMinStock("5");
      setSelectedProductIdForVariant(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteVariant = async (id: string) => {
    if (!(await confirmAction({ title: "Remover este subproduto?", confirmLabel: "Remover", destructive: true }))) return;
    const { error } = await supabase.from("product_variants").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Subproduto removido");
      load();
    }
  };

  const saveFinancialSettings = async () => {
    if (!user) return;
    try {
      await supabase.from("business_settings").upsert({
        user_id: user.id,
        tax_rate: Number(taxRate),
        monthly_expenses: Number(monthlyExpenses),
        profits_distribution: Number(profitsDistribution),
        nubank_pix_key: nubankPixKey,
        nubank_pix_name: nubankPixName,
        manual_balance: Number(manualBalance),
        infinitypay_handle: infinitypayHandle.trim().replace(/^@/, "") || null,
        infinitypay_sandbox: infinitypaySandbox,
      } as any, { onConflict: "user_id" });
      
      await mutations.updateSalesTarget.mutateAsync({
        month: currentMonth,
        year: currentYear,
        target_amount: Number(monthlyTarget)
      });

      if (user) {
        localStorage.setItem(`infinitypay_handle_${user.id}`, infinitypayHandle.trim().replace(/^@/, ""));
        localStorage.setItem(`infinitypay_sandbox_${user.id}`, infinitypaySandbox ? "1" : "0");
      }
      toast.success("Configurações financeiras salvas!");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    }
  };
  
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/logo-${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from(BUCKETS.businessAssets)
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKETS.businessAssets)
        .getPublicUrl(filePath);
        
      setLogoUrl(publicUrl);
      
      // Update settings immediately
      await upsertBusinessSettings(user.id, {
        tax_rate: Number(taxRate),
        monthly_expenses: Number(monthlyExpenses),
        logo_url: publicUrl
      });
      
      toast.success("Logo atualizada com sucesso!");
    } catch (e: any) {
      toast.error("Erro no upload: " + e.message);
    } finally {
      setUploadingLogo(false);
    }
  };

   const loadAllowedEmails = async () => {
    if (!isAdmin) return;
    const { data } = await supabase.from('allowed_emails').select('*').order('created_at', { ascending: false });
    if (data) setAllowedEmails(data);
  };

  useEffect(() => {
    if (activeTab === 'employees') {
      loadAllowedEmails();
    }
  }, [activeTab, isAdmin]);

  const addAllowedEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) return toast.error("E-mail inválido");
    if (!newNameEmployee) return toast.error("Nome do funcionário é obrigatório");
    try {
      const { error } = await supabase.from('allowed_emails').insert({ 
        email: newEmail.toLowerCase().trim(),
        name: newNameEmployee.trim()
      });
      if (error) throw error;
      toast.success("Funcionário autorizado!");
      setNewEmail("");
      setNewNameEmployee("");
      loadAllowedEmails();
    } catch (e: any) {
      toast.error("Erro ao adicionar: " + e.message);
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>, email: string) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `signatures/${email}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from(BUCKETS.businessAssets)
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKETS.businessAssets)
        .getPublicUrl(filePath);
        
      const { error: updateError } = await supabase
        .from('allowed_emails')
        .update({ signature_url: publicUrl })
        .eq('email', email);

      if (updateError) throw updateError;
      
      toast.success("Assinatura atualizada!");
      loadAllowedEmails();
    } catch (e: any) {
      toast.error("Erro no upload: " + e.message);
    }
  };

  const updateProfileRole = async (id: string, role: string) => {
    try {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
      if (error) throw error;
      toast.success("Cargo atualizado!");
      loadAllowedEmails();
    } catch (e: any) {
      toast.error("Erro ao atualizar cargo: " + e.message);
    }
  };

  const updateProfileCommission = async (id: string, rate: number) => {
    try {
      const { error } = await supabase.from('profiles').update({ commission_rate: rate }).eq('id', id);
      if (error) throw error;
      toast.success("Comissão atualizada!");
      loadAllowedEmails();
    } catch (e: any) {
      toast.error("Erro ao atualizar comissão: " + e.message);
    }
  };

  const removeAllowedEmail = async (email: string) => {
    if (email === 'melhoracooficial@gmail.com') return toast.error("Não é possível remover o administrador");
    if (!(await confirmAction({ title: `Remover acesso de ${email}?`, description: "Essa pessoa deixa de entrar no sistema.", confirmLabel: "Remover acesso", destructive: true }))) return;
    try {
      const { error } = await supabase.from('allowed_emails').delete().eq('email', email);
      if (error) throw error;
      toast.success("Acesso revogado!");
      loadAllowedEmails();
    } catch (e: any) {
      toast.error("Erro ao remover: " + e.message);
    }
  };

  const handleEditEmployee = (item: any) => {
    setEditingEmail(item.email);
    setEditNameValue(item.name || "");
    setEditEmailValue(item.email);
  };

  const cancelEdit = () => {
    setEditingEmail(null);
    setEditNameValue("");
    setEditEmailValue("");
  };

  const saveEmployeeEdit = async (oldEmail: string) => {
    if (!editNameValue.trim()) return toast.error("Nome é obrigatório");
    if (!editEmailValue.includes("@")) return toast.error("E-mail inválido");

    try {
      const { error } = await supabase
        .from('allowed_emails')
        .update({ 
          name: editNameValue.trim(),
          email: editEmailValue.toLowerCase().trim()
        })
        .eq('email', oldEmail);

      if (error) throw error;
      
      toast.success("Dados do funcionário atualizados!");
      cancelEdit();
      loadAllowedEmails();
    } catch (e: any) {
      toast.error("Erro ao atualizar: " + e.message);
    }
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-10 space-y-10 animate-in fade-in duration-500 max-w-6xl mx-auto pb-32">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="flex items-center gap-5">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/")} 
              className="rounded-2xl h-14 w-14 bg-card shadow-sm border border-border hover:bg-muted transition-all active:scale-95"
            >
              <ArrowLeft className="w-6 h-6 text-foreground" />
            </Button>
            <div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground">Configurações</h1>
              <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest mt-1 opacity-80">Gerencie seu catálogo e equipe</p>
            </div>
          </div>

          <div className="bg-muted/50 p-1.5 rounded-[1.5rem] border border-border/50 flex flex-wrap gap-1 backdrop-blur-sm overflow-x-auto no-scrollbar">
             {[
               { id: "branding", label: "Branding", icon: ImageIcon },
               { id: "catalog", label: "Catálogo", icon: Package },
               { id: "landing-pages", label: "Vendas", icon: Zap },
               { id: "financial", label: "Financeiro", icon: Calculator },
               { id: "employees", label: "Funcionários", icon: Users },
               { id: "referrals", label: "Indicações", icon: Gift },
               { id: "logs", label: "Logs", icon: ShieldCheck, adminOnly: true },
               { id: "backups", label: "Backups", icon: HardDrive, adminOnly: true }
             ].map((tab) => {
               if (tab.adminOnly && !isAdmin) return null;
               const Icon = tab.icon;
               return (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id)}
                   className={cn(
                     "px-5 py-3 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2.5 whitespace-nowrap",
                     activeTab === tab.id 
                      ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]" 
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                   )}
                 >
                   <Icon className="w-4 h-4" /> {tab.label}
                 </button>
               );
             })}
          </div>
        </header>

        {isAdmin && (
          <section aria-labelledby="tech-title" className="bg-card border border-border rounded-3xl p-6 space-y-4">
            <div>
              <h2 id="tech-title" className="text-sm font-black uppercase tracking-widest text-muted-foreground">Técnico</h2>
              <p className="text-sm text-muted-foreground">Ferramentas para checar pagamentos. Só o administrador vê esta área.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button asChild variant="outline" className="h-12 rounded-2xl justify-start font-black">
                <Link to="/admin/pagamentos/eventos">Eventos de pagamento</Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-2xl justify-start font-black">
                <Link to="/diag/payments">Diagnósticos de pagamento</Link>
              </Button>
            </div>
          </section>
        )}

        {activeTab === "branding" ? (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div className="bg-card p-10 rounded-[3rem] border border-border shadow-2xl shadow-black/5 space-y-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tighter text-foreground">Aparência do Sistema</h2>
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Personalize sua marca no sistema</p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-10 items-center border-t border-border pt-10">
                <div className="space-y-6">
                  <div className="p-8 border-2 border-dashed border-border rounded-[2rem] flex flex-col items-center justify-center gap-4 hover:border-primary/50 transition-all group relative overflow-hidden bg-muted/30">
                    {logoUrl ? (
                      <div className="relative group w-full flex flex-col items-center">
                        <img src={logoUrl} alt="Logo" className="max-h-32 object-contain rounded-xl shadow-lg mb-4 bg-white p-2" />
                        <label className="cursor-pointer bg-card px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-muted border border-border flex items-center gap-2 text-foreground">
                          <Upload className="w-3 h-3" /> Alterar Logo
                          <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} />
                        </label>
                      </div>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg text-slate-200 group-hover:text-primary transition-colors">
                          <ImageIcon className="w-8 h-8" />
                        </div>
                        <div className="text-center">
                          <p className="font-black text-foreground">Carregar Logotipo</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">PNG ou JPG (Máx. 2MB)</p>
                        </div>
                        <label className="absolute inset-0 cursor-pointer">
                          <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} />
                        </label>
                      </>
                    )}
                    {uploadingLogo && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
                        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-900 p-6 rounded-[2rem] text-white space-y-3 shadow-xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Visualização do Cabeçalho</p>
                    <div className="flex items-center gap-4">
                      {logoUrl ? (
                        <img src={logoUrl} className="w-10 h-10 object-contain bg-white rounded-lg p-1" />
                      ) : (
                        <div className="w-10 h-10 bg-primary rounded-lg" />
                      )}
                      <div>
                        <p className="font-black text-sm tracking-tight">MELHORAÇO INOX</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase">Orçamento Nº #8271A</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 italic px-4">
                    * Esta logo será exibida automaticamente no topo de todos os PDFs gerados pelo sistema.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "catalog" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-right-4 duration-500">
            <div className="lg:col-span-1">
                <div className="bg-card p-8 rounded-3xl border border-border shadow-2xl shadow-black/5 space-y-8 sticky top-10">
                  <div className="flex items-center gap-3 text-primary">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                      <Plus className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-black tracking-tight">Novo Item</h2>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest flex items-center gap-2">
                        <Package className="w-3 h-3" /> Nome
                      </label>
                      <Input 
                        placeholder="Ex: Letra de Aço Inox" 
                        value={newName} 
                        onChange={e => setNewName(e.target.value)} 
                        className="h-14 rounded-2xl bg-muted border-none focus-visible:ring-primary/20 text-lg font-bold text-foreground"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest flex items-center gap-2">
                          <Tag className="w-3 h-3" /> Preço R$
                        </label>
                        <Input 
                          placeholder="0,00" 
                          type="number" 
                          value={newPrice} 
                          onChange={e => setNewPrice(e.target.value)} 
                          className="h-14 rounded-2xl bg-muted border-none focus-visible:ring-primary/20 text-lg font-bold text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest flex items-center gap-2 text-indigo-400">
                          <Coins className="w-3 h-3" /> Custo R$
                        </label>
                        <Input 
                          placeholder="0,00" 
                          type="number" 
                          value={newCost} 
                          onChange={e => setNewCost(e.target.value)} 
                          className="h-14 rounded-2xl bg-muted border-none focus-visible:ring-primary/20 text-lg font-bold text-foreground"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest flex items-center gap-2">
                           Estoque Inicial
                        </label>
                        <Input 
                          placeholder="0" 
                          type="number" 
                          value={newStock} 
                          onChange={e => setNewStock(e.target.value)} 
                          className="h-14 rounded-2xl bg-muted border-none focus-visible:ring-primary/20 text-lg font-bold text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest flex items-center gap-2">
                           Aviso Est. Baixo
                        </label>
                        <Input 
                          placeholder="5" 
                          type="number" 
                          value={newMinStock} 
                          onChange={e => setNewMinStock(e.target.value)} 
                          className="h-14 rounded-2xl bg-muted border-none focus-visible:ring-primary/20 text-lg font-bold text-foreground"
                        />
                      </div>
                    </div>
                  </div>

                  <CatalogFields name={newName} value={newCatalog} onChange={setNewCatalog} />
                  <Button onClick={addProduct} disabled={loading} className="w-full h-16 rounded-[2rem] font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all">
                    {loading ? "ADICIONANDO..." : "ADICIONAR ITEM"}
                  </Button>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
                <CatalogManager />
                <div className="flex items-center justify-between px-4">
                  <div className="flex items-center gap-3">
                    <Layers className="w-5 h-5 text-slate-400" />
                    <h2 className="text-xl font-black tracking-tight text-foreground">Produtos Cadastrados</h2>
                  </div>
                  <span className="text-[10px] font-black px-4 py-1 bg-muted rounded-full text-muted-foreground">{products.length} ITENS</span>
                </div>

                <div className="grid gap-4">
                  {products.map(p => (
                    <div key={p.id} className="bg-card p-6 rounded-[2rem] border border-border flex flex-col gap-4 group hover:border-primary/20 transition-all duration-300 shadow-lg shadow-black/5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary transition-all duration-300">
                            <Package className="w-7 h-7" />
                          </div>
                          <div>
                            <p className="font-black text-lg text-foreground tracking-tight">{p.name}</p>
                            <div className="flex items-center gap-3">
                              <p className="text-base font-bold text-primary">{formatCurrency(p.price)}</p>
                              <span className="w-1 h-1 bg-slate-200 rounded-full" />
                              <p className="text-xs font-bold text-slate-400">Custo: {formatCurrency(p.cost)}</p>
                              {(!p.variants || p.variants.length === 0) && (
                                <>
                                  <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                  <p className={cn("text-xs font-bold", !p.made_to_order && (p.stock_quantity ?? 0) <= (p.min_stock_level ?? 0) ? "text-red-500" : "text-slate-400")}>
                                    Estoque: {p.stock_quantity ?? 0}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Dialog open={selectedProductIdForVariant === p.id} onOpenChange={(open) => setSelectedProductIdForVariant(open ? p.id : null)}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-10 rounded-xl gap-2 font-bold text-[10px] uppercase tracking-wider text-primary hover:bg-primary/5">
                                <Plus className="w-3.5 h-3.5" /> SUBPRODUTO
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-card border-border text-foreground rounded-3xl max-w-md">
                              <DialogHeader>
                                <DialogTitle className="text-2xl font-black tracking-tight">Novo Subproduto para {p.name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <label className="label-caps">Nome da Variante (ex: 15cm - Inox)</label>
                                  <Input 
                                    value={newVariantName} 
                                    onChange={e => setNewVariantName(e.target.value)}
                                    className="bg-muted border-none h-12 rounded-xl font-bold"
                                    placeholder="Ex: Tamanho P, Cor Azul..."
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <label className="label-caps">Ajuste no Preço R$</label>
                                    <Input 
                                      type="number"
                                      value={newVariantPriceAdj} 
                                      onChange={e => setNewVariantPriceAdj(e.target.value)}
                                      className="bg-muted border-none h-12 rounded-xl font-bold"
                                      placeholder="0.00"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="label-caps">Estoque Inicial</label>
                                    <Input 
                                      type="number"
                                      value={newVariantStock} 
                                      onChange={e => setNewVariantStock(e.target.value)}
                                      className="bg-muted border-none h-12 rounded-xl font-bold"
                                      placeholder="0"
                                    />
                                  </div>
                                </div>
                                <Button onClick={addVariant} className="w-full h-14 rounded-xl font-black mt-4 shadow-lg shadow-primary/20">SALVAR SUBPRODUTO</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl text-slate-200 hover:text-red-500 hover:bg-red-50 transition-all" onClick={() => deleteProduct(p.id)}>
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>

                      {p.variants && p.variants.length > 0 && (
                        <div className="pl-14 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Subprodutos:</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {p.variants.map(v => (
                              <div key={v.id} className="bg-muted/40 p-3 rounded-xl border border-border/50 flex justify-between items-center group/variant">
                                <div>
                                  <p className="font-bold text-sm text-foreground">{v.name}</p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-bold text-primary">+{formatCurrency(v.price_adjustment)}</p>
                                    <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                    <p className={cn("text-[10px] font-bold", !p.made_to_order && (v.stock_quantity ?? 0) <= (v.min_stock_level ?? 0) ? "text-red-500" : "text-slate-400")}>
                                      Estoque: {v.stock_quantity ?? 0}
                                    </p>
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 rounded-lg text-slate-200 hover:text-red-500 opacity-0 group-hover/variant:opacity-100 transition-all" 
                                  onClick={() => deleteVariant(v.id)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {products.length === 0 && (
                    <div className="text-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg text-slate-200">
                        <Package className="w-8 h-8" />
                      </div>
                      <p className="text-slate-400 font-bold">Nenhum produto cadastrado no catálogo.</p>
                    </div>
                  )}
                </div>
            </div>
          </div>
        ) : activeTab === "financial" ? (

          <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-right-4 duration-500">
             <div className="bg-card p-10 rounded-[3rem] border border-border shadow-2xl shadow-black/5 space-y-10">
                <div className="flex items-center gap-4">
                   <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                      <Calculator className="w-8 h-8" />
                   </div>
                   <div>
                      <h2 className="text-2xl font-black tracking-tighter text-foreground">Métricas de Negócio</h2>
                      <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Defina suas taxas e objetivos financeiros</p>
                   </div>
                </div>

                <div className="grid md:grid-cols-2 gap-10">
                   <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest flex items-center gap-2">
                           <CreditCard className="w-3 h-3 text-primary" /> Chave PIX Nubank
                        </label>
                        <Input 
                           placeholder="Sua chave PIX" 
                           value={nubankPixKey}
                           onChange={e => setNubankPixKey(e.target.value)}
                           className="h-16 rounded-2xl bg-muted border-none focus-visible:ring-primary/20 text-xl font-black text-foreground"
                        />
                        <p className="text-[10px] text-slate-400 font-bold ml-4">Usada para integração de pagamentos Nubank.</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest flex items-center gap-2">
                           <User className="w-3 h-3 text-primary" /> Nome do Favorecido (PIX)
                        </label>
                        <Input 
                           placeholder="Nome completo do recebedor" 
                           value={nubankPixName}
                           onChange={e => setNubankPixName(e.target.value)}
                           className="h-16 rounded-2xl bg-muted border-none focus-visible:ring-primary/20 text-xl font-black text-foreground"
                        />
                        <p className="text-[10px] text-slate-400 font-bold ml-4">Nome que aparecerá no QR Code PIX.</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest flex items-center gap-2">
                           <Zap className="w-3 h-3 text-primary" /> Handle InfinityPay (Cartão)
                        </label>
                        <Input
                           placeholder="Ex: melhoraco"
                           value={infinitypayHandle}
                           onChange={e => setInfinitypayHandle(e.target.value)}
                           className="h-16 rounded-2xl bg-muted border-none focus-visible:ring-primary/20 text-xl font-black text-foreground"
                        />
                        <p className="text-[10px] text-slate-400 font-bold ml-4">Seu @handle da InfinityPay. Gera link de checkout com cartão de crédito automaticamente.</p>
                      </div>

                      <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted px-4 py-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-foreground">Modo Sandbox InfinityPay</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-1">Simula pagamentos sem cobrar valores reais. Ideal para testes.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={infinitypaySandbox}
                          onChange={e => setInfinitypaySandbox(e.target.checked)}
                          className="w-6 h-6 accent-primary"
                        />
                      </div>




                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest flex items-center gap-2">
                           <Percent className="w-3 h-3 text-red-400" /> Impostos (%)
                        </label>
                        <Input 
                           placeholder="Ex: 6.5" 
                           type="number"
                           value={taxRate}
                           onChange={e => setTaxRate(e.target.value)}
                           className="h-16 rounded-2xl bg-muted border-none focus-visible:ring-primary/20 text-xl font-black text-foreground"
                        />
                        <p className="text-[10px] text-slate-400 font-bold ml-4">Descontado automaticamente da Receita Bruta na DRE.</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest flex items-center gap-2">
                           <DollarSign className="w-3 h-3 text-slate-900" /> Despesas Fixas (R$)
                        </label>
                        <Input 
                           placeholder="Ex: 2500" 
                           type="number"
                           value={monthlyExpenses}
                           onChange={e => setMonthlyExpenses(e.target.value)}
                           className="h-16 rounded-2xl bg-muted border-none focus-visible:ring-primary/20 text-xl font-black text-foreground"
                        />
                        <p className="text-[10px] text-slate-400 font-bold ml-4">Ex: Aluguel, Pro-labore, Softwares, etc.</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest flex items-center gap-2">
                           <TrendingUp className="w-3 h-3 text-emerald-500" /> Dist. Lucros (%)
                        </label>
                        <Input 
                           placeholder="Ex: 20" 
                           type="number"
                           value={profitsDistribution}
                           onChange={e => setProfitsDistribution(e.target.value)}
                           className="h-16 rounded-2xl bg-muted border-none focus-visible:ring-primary/20 text-xl font-black text-foreground"
                        />
                        <p className="text-[10px] text-slate-400 font-bold ml-4">Percentual do lucro líquido para reserva ou distribuição.</p>
                       <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest flex items-center gap-2">
                           <Wallet className="w-3 h-3 text-indigo-500" /> Saldo Inicial/Manual (R$)
                        </label>
                        <Input 
                           placeholder="Ex: 5000" 
                           type="number"
                           value={manualBalance}
                           onChange={e => setManualBalance(e.target.value)}
                           className="h-16 rounded-2xl bg-muted border-none focus-visible:ring-primary/20 text-xl font-black text-foreground"
                        />
                        <p className="text-[10px] text-slate-400 font-bold ml-4">Saldo base que será somado às movimentações.</p>
                      </div>
                   </div>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest flex items-center gap-2">
                           <TrendingUp className="w-3 h-3 text-primary" /> Meta de Vendas (R$)
                        </label>
                        <Input 
                           placeholder="Ex: 15000" 
                           type="number"
                           value={monthlyTarget}
                           onChange={e => setMonthlyTarget(e.target.value)}
                           className="h-16 rounded-2xl bg-slate-900 text-white border-none focus-visible:ring-primary/20 text-xl font-black placeholder:text-slate-600"
                        />
                        <p className="text-[10px] text-slate-400 font-bold ml-4">Objetivo de faturamento bruto para o mês atual.</p>
                      </div>

                      <div className="p-6 bg-muted rounded-[2rem] border border-border flex flex-col justify-center gap-2 h-[108px]">
                         <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Seu Ponto de Equilíbrio</p>
                         <p className="text-xl font-black text-foreground">
                           {breakEvenPoint > 0 ? formatCurrency(breakEvenPoint) : "Dados insuficientes"}
                         </p>
                      </div>
                   </div>
                </div>

                <Button 
                  onClick={saveFinancialSettings}
                  className="w-full h-20 rounded-3xl font-black text-xl shadow-2xl shadow-primary/30 hover:scale-[1.01] transition-all"
                >
                   SALVAR CONFIGURAÇÕES FINANCEIRAS
                </Button>
             </div>
          </div>
        ) : activeTab === "employees" ? (

          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="bg-card p-10 rounded-[3rem] border border-border shadow-2xl shadow-black/5 space-y-10">
                <div className="flex items-center gap-4">
                   <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                      <ShieldCheck className="w-8 h-8" />
                   </div>
                   <div>
                      <h2 className="text-2xl font-black tracking-tighter text-foreground">Controle de Acesso</h2>
                      <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Apenas e-mails autorizados podem acessar o sistema</p>
                   </div>
                </div>

                {!isAdmin ? (
                   <div className="p-8 bg-red-50 rounded-3xl border border-red-100 flex items-center gap-4 text-red-600">
                      <Ban className="w-8 h-8 shrink-0" />
                      <p className="font-bold">Apenas o administrador master pode gerenciar funcionários.</p>
                   </div>
                ) : (
                  <div className="space-y-10">
                    <div className="bg-muted/30 p-8 rounded-3xl border border-border space-y-6">
                      <div className="flex items-center gap-3">
                        <UserPlus className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-black tracking-tight text-foreground">Novo Acesso</h3>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">Nome Completo</label>
                          <Input 
                            placeholder="Ex: João Silva" 
                            value={newNameEmployee}
                            onChange={e => setNewNameEmployee(e.target.value)}
                            className="h-14 rounded-2xl bg-card border-border font-bold text-foreground"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-widest">E-mail de Trabalho</label>
                          <div className="relative group">
                            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <Input 
                              placeholder="joao@melhoraco.com" 
                              value={newEmail}
                              onChange={e => setNewEmail(e.target.value)}
                              className="h-14 pl-12 rounded-2xl bg-card border-border font-bold text-foreground"
                            />
                          </div>
                        </div>
                      </div>
                      <Button 
                        onClick={addAllowedEmail}
                        className="w-full h-14 rounded-2xl font-black gap-2 shadow-lg shadow-primary/10 hover:scale-[1.01] transition-all"
                      >
                        CONFIRMAR AUTORIZAÇÃO
                      </Button>
                    </div>

                    <div className="space-y-4">
                       <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 ml-4">Funcionários Ativos</h3>
                       <div className="grid gap-4">
                          {allowedEmails.map((item) => (
                             <div key={item.email} className="bg-card p-6 rounded-[2rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group border border-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all">
                                <div className="flex items-center gap-4 flex-1 w-full">
                                   <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0 border border-border">
                                      <Users className="w-6 h-6" />
                                   </div>
                                   
                                   {editingEmail === item.email ? (
                                      <div className="flex-1 grid md:grid-cols-2 gap-3 w-full">
                                         <Input 
                                            value={editNameValue}
                                            onChange={e => setEditNameValue(e.target.value)}
                                            placeholder="Nome"
                                            className="h-10 rounded-xl font-bold"
                                         />
                                         <Input 
                                            value={editEmailValue}
                                            onChange={e => setEditEmailValue(e.target.value)}
                                            placeholder="E-mail"
                                            className="h-10 rounded-xl font-bold"
                                         />
                                      </div>
                                   ) : (
                                      <div className="space-y-0.5">
                                         <p className="font-black text-foreground text-lg">{item.name || 'Sem Nome'}</p>
                                         <div className="flex flex-wrap items-center gap-2">
                                           <p className="text-sm font-bold text-slate-500">{item.email}</p>
                                           <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Entrou em {new Date(item.created_at).toLocaleDateString()}</p>
                                         </div>
                                      </div>
                                   )}
                                </div>

                                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                                   {editingEmail === item.email ? (
                                      <>
                                         <Button 
                                            size="icon" 
                                            className="h-10 w-10 rounded-xl bg-green-500 hover:bg-green-600 text-white"
                                            onClick={() => saveEmployeeEdit(item.email)}
                                         >
                                            <Check className="w-5 h-5" />
                                         </Button>
                                         <Button 
                                            size="icon" 
                                            variant="ghost"
                                            className="h-10 w-10 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
                                            onClick={cancelEdit}
                                         >
                                            <X className="w-5 h-5" />
                                         </Button>
                                      </>
                                   ) : (
                                      <>
                                         <div className="flex items-center gap-3">
                                            {item.signature_url ? (
                                               <div className="flex flex-col items-center gap-1 group/sig">
                                                  <div className="relative">
                                                    <img src={item.signature_url} alt="Assinatura" className="h-12 bg-slate-50 rounded-xl p-1.5 border border-slate-100 shadow-inner" />
                                                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/sig:opacity-100 transition-opacity rounded-xl cursor-pointer">
                                                      <Upload className="w-4 h-4 text-white" />
                                                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleSignatureUpload(e, item.email)} />
                                                    </label>
                                                  </div>
                                               </div>
                                            ) : (
                                               <label className="cursor-pointer bg-muted p-2 rounded-xl text-muted-foreground hover:bg-primary hover:text-white border border-border flex items-center gap-2 transition-all" title="Adicionar Assinatura">
                                                  <Upload className="w-4 h-4" />
                                                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleSignatureUpload(e, item.email)} />
                                               </label>
                                            )}
                                            
                                            <Button 
                                               variant="ghost" 
                                               size="icon" 
                                               className="h-10 w-10 rounded-xl text-slate-300 hover:text-primary hover:bg-primary/5 transition-all"
                                               onClick={() => handleEditEmployee(item)}
                                            >
                                               <Edit2 className="w-4 h-4" />
                                            </Button>

                                            {item.email !== 'melhoracooficial@gmail.com' && (
                                              <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-10 w-10 rounded-xl text-slate-200 hover:text-red-500 hover:bg-red-50 transition-all"
                                                onClick={() => removeAllowedEmail(item.email)}
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </Button>
                                            )}
                                         </div>
                                      </>
                                   )}
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                  </div>
                )}
            </div>
          </div>
        ) : activeTab === "logs" ? (


          <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-right-4 duration-500">
             <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/40 space-y-10">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                         <ShieldCheck className="w-8 h-8" />
                      </div>
                      <div>
                         <h2 className="text-2xl font-black tracking-tighter text-slate-900">Log de Auditoria</h2>
                         <p className="text-sm font-bold text-slate-400">Rastro completo de ações no sistema</p>
                      </div>
                   </div>
                   <Button variant="outline" size="sm" onClick={loadAllowedEmails} className="rounded-xl border-2">
                      <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
                   </Button>
                </div>

                <div className="space-y-4">
                   {activityLogs?.data?.map((log) => (
                      <div key={log.id} className="p-6 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-200 transition-all flex items-start gap-6">
                         <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                            <Clock className="w-5 h-5" />
                         </div>
                         <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                               <span className="font-black text-slate-900">{log.user_email}</span>
                               <span className="text-[10px] font-bold text-white bg-primary px-2 py-0.5 rounded-full uppercase">{log.action}</span>
                            </div>
                            <p className="text-sm font-medium text-slate-600">
                               Modificou {log.entity_type} <span className="font-mono text-xs bg-slate-200 px-1.5 py-0.5 rounded">#{log.entity_id?.slice(0, 8)}</span>
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                               {new Date(log.created_at).toLocaleString('pt-BR')}
                            </p>
                         </div>
                      </div>
                   ))}
                   {(!activityLogs?.data || activityLogs.data.length === 0) && (
                      <div className="text-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed">
                         <p className="text-slate-400 font-bold">Nenhuma atividade registrada ainda.</p>
                      </div>
                   )}
                </div>
             </div>
          </div>
        ) : activeTab === "landing-pages" ? (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <LandingPagesManager />
          </div>
        ) : activeTab === "backups" && isAdmin ? (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <BackupsPanel />
          </div>
        ) : activeTab === "referrals" ? (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <ReferralsPanel />
          </div>
        ) : null}
      </div>
    </MainLayout>
  );
}
