import { motion } from "framer-motion";
import { FADE_IN_VARIANTS } from "./ResellerData";

export const SocialProofSection = () => (
  <section className="py-32 px-4 bg-[#080808]">
    <div className="container mx-auto max-w-4xl text-center">
      <motion.div {...FADE_IN_VARIANTS}>
        <span className="text-zinc-600 text-[10px] uppercase tracking-[0.3em] font-semibold mb-6 block">Comunidade Melhoraço</span>
        <h2 className="text-4xl md:text-6xl font-bold leading-tight mb-16">O que dizem nossos curadores de marca.</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left">
          {[
            { text: "A Melhoraço não entrega apenas números, entrega o acabamento que meus projetos de luxo exigem.", author: "Ricardo S.", role: "Arquiteto & Revendedor" },
            { text: "A facilidade de revenda pela qualidade do polimento é o que nos mantém parceiros há anos.", author: "Ana Paula", role: "Design de Interiores" }
          ].map((item, i) => (
            <div key={i} className="relative pl-8 border-l border-zinc-800">
              <p className="text-xl text-zinc-400 mb-6 font-light italic leading-relaxed">"{item.text}"</p>
              <cite className="not-italic">
                <span className="block text-sm font-bold text-white">{item.author}</span>
                <span className="block text-xs text-zinc-600 uppercase tracking-widest mt-1">{item.role}</span>
              </cite>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
);
