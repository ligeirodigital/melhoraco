import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WHATSAPP_LINK, FADE_IN_VARIANTS } from "./ResellerData";

export const HeroSection = () => (
  <section className="relative min-h-[90vh] flex items-center justify-center px-4 pt-20 overflow-hidden">
    {/* Subtle Ambient Background */}
    <div className="absolute inset-0 z-0">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-zinc-800/10 rounded-full blur-[120px] sm:animate-pulse" />
      <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-zinc-700/5 rounded-full blur-[100px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#050505_80%)] hidden sm:block" />
      <div className="absolute inset-0 bg-black/60 sm:hidden" />
    </div>

    <div className="container mx-auto text-center relative z-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.21, 0.45, 0.32, 0.9] }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/50 border border-zinc-800 text-[10px] uppercase tracking-[0.2em] font-medium text-zinc-500 mb-8"
      >
        <span className="w-1 h-1 rounded-full bg-zinc-500" />
        Edição Limitada para Revendedores
      </motion.div>
      
      <motion.h1 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.2 }}
        className="text-5xl md:text-8xl font-bold tracking-tight mb-8 leading-[0.95]"
      >
        A Essência do <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-400 to-zinc-600">
          Aço Inox Polido
        </span>
      </motion.h1>
      
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.4 }}
        className="text-lg md:text-xl text-zinc-500 mb-12 max-w-2xl mx-auto font-light leading-relaxed"
      >
        Eleve seu portfólio com peças que transcendem a sinalização residencial. 
        AISI 304, acabamento espelhado e precisão industrial.
      </motion.p>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.6 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-6"
      >
        <Button 
          asChild
          className="bg-white hover:bg-zinc-200 text-black h-16 px-10 rounded-full text-sm uppercase tracking-widest font-bold transition-all duration-500 hover:scale-105"
        >
          <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
            Iniciar Consultoria
            <ArrowRight className="w-4 h-4" />
          </a>
        </Button>
        <div className="text-zinc-600 text-xs font-medium flex items-center gap-4">
          <span className="flex items-center gap-1"><Check className="w-3 h-3 text-white" /> Envio Full</span>
          <span className="flex items-center gap-1"><Check className="w-3 h-3 text-white" /> Atacado Direto</span>
        </div>
      </motion.div>
    </div>
  </section>
);
