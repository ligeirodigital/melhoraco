import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Star, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.jfif";
import { Button } from "@/components/ui/button";

type FeedbackRow = {
  id: string;
  rating: number;
  comment: string | null;
  project_photo_url: string | null;
  created_at: string;
  quote_id: string | null;
};

type QuoteMini = {
  id: string;
  clients: { name: string | null } | null;
};

export default function PublicGalleryPage() {
  const gallery = useQuery({
    queryKey: ["public-gallery"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_feedbacks")
        .select("id, rating, comment, project_photo_url, created_at, quote_id")
        .not("project_photo_url", "is", null)
        .gte("rating", 4)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      const feedbacks = (data ?? []) as FeedbackRow[];

      const quoteIds = feedbacks.map((f) => f.quote_id).filter(Boolean) as string[];
      const quotesMap = new Map<string, QuoteMini>();
      if (quoteIds.length) {
        const { data: qs } = await supabase
          .from("quotes")
          .select("id, clients:client_id (name)")
          .in("id", quoteIds);
        (qs ?? []).forEach((q) => quotesMap.set(q.id, q as any));
      }

      return feedbacks.map((f) => ({ ...f, quote: f.quote_id ? quotesMap.get(f.quote_id) : null }));
    },
  });

  const items = gallery.data ?? [];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 backdrop-blur-md bg-slate-950/80 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Melhoraço" className="w-10 h-10 rounded-xl object-cover" loading="lazy" />
            <div>
              <p className="font-black tracking-tight text-white">Melhoraço</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Nossos projetos</p>
            </div>
          </Link>
          <Button variant="ghost" size="sm" asChild className="text-white/70 hover:text-white">
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-2" />Início</Link>
          </Button>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-3">
          Projetos entregues.
        </h1>
        <p className="text-white/60 text-lg max-w-2xl">
          Fotos e depoimentos reais de clientes que aprovaram nosso trabalho.
        </p>

        {gallery.isLoading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-32">
            <p className="text-white/40">Nenhum projeto publicado ainda.</p>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((f) => {
              const firstName = f.quote?.clients?.name?.split(" ")[0] || "Cliente";
              return (
                <article key={f.id} className="bg-slate-900 rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 transition-colors group">
                  <div className="aspect-square overflow-hidden bg-slate-800">
                    <img
                      src={f.project_photo_url!}
                      alt={`Projeto de ${firstName}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-1 mb-2">
                      {Array.from({ length: f.rating }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    {f.comment && (
                      <p className="text-sm text-white/70 line-clamp-3 mb-3">"{f.comment}"</p>
                    )}
                    <p className="text-xs font-bold text-white/90">
                      {firstName}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
