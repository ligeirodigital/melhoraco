import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { WHATSAPP_LINK } from "./ResellerData";
import logo from "@/assets/logo.jfif";

export const ResellerNavbar = () => (
  <nav className="fixed top-0 w-full z-50 px-6 py-6 pointer-events-none">
    <div className="container mx-auto flex justify-between items-center">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3 pointer-events-auto"
      >
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden">
           <img 
             src={logo} 
             alt="Logo" 
             width={40}
             height={40}
             className="w-full h-full object-contain" 
             decoding="async"
           />
        </div>
        <span className="font-bold tracking-tighter text-xl">MELHORAÇO</span>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="pointer-events-auto"
      >
        <Button asChild variant="outline" className="rounded-full border-zinc-800 bg-black/20 backdrop-blur-md text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-all duration-500">
          <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer">Seja Parceiro</a>
        </Button>
      </motion.div>
    </div>
  </nav>
);

export const ProductShowcase = () => (
  <section className="py-24 px-4 relative overflow-hidden">
    <div className="container mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.21, 0.45, 0.32, 0.9] }}
        className="max-w-6xl mx-auto relative group"
      >
        <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        <div className="relative rounded-[2rem] overflow-hidden border border-zinc-800/50 bg-zinc-900/20 backdrop-blur-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]">
          <img 
            src="https://wogunbzijppmeuleitjq.supabase.co/storage/v1/object/public/temp-images/7140f98a-d6dc-439d-9633-98de4e3c68f3.png" 
            alt="Product Showcase" 
            loading="lazy"
            decoding="async"
            width={1200}
            height={800}
            className="w-full h-auto object-cover transform scale-100 hover:scale-105 transition-transform duration-[2s] ease-out"
          />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 bg-gradient-to-t from-black via-black/80 to-transparent">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h3 className="text-xl md:text-2xl font-bold tracking-tight">Escultura 3D Premium</h3>
                <p className="text-zinc-400 text-xs md:text-sm">Aço Inox Polido AISI 304 - 15cm</p>
              </div>
              <div className="w-fit px-4 py-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest">
                Disponível em Atacado
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export const FinalCta = () => (
  <section className="py-40 px-4 relative overflow-hidden bg-white text-black">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_#f0f0f0_0%,_transparent_60%)]" />
    <div className="container mx-auto text-center relative z-10">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <span className="text-black/40 text-[10px] uppercase tracking-[0.4em] font-bold mb-8 block">Inicie sua Parceria</span>
        <h2 className="text-5xl md:text-8xl font-black mb-12 tracking-tighter leading-tight">
          Torne-se um <br />Embaixador Melhoraço.
        </h2>
        <Button 
          asChild
          className="bg-black hover:bg-zinc-800 text-white h-16 md:h-20 px-8 md:px-16 rounded-full text-xs md:text-sm uppercase tracking-[0.2em] font-black transition-all hover:scale-105 w-full sm:w-auto"
        >
          <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 md:gap-4 text-white">
            Consultar via WhatsApp
            <motion.div 
              animate={{ x: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <ArrowRight className="w-6 h-6" />
            </motion.div>
          </a>
        </Button>
      </motion.div>
    </div>
  </section>
);

import { ArrowRight } from "lucide-react";
