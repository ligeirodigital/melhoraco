import { motion } from "framer-motion";
import { HelpCircle, ChevronDown } from "lucide-react";
import { FAQ_DATA, FADE_IN_VARIANTS } from "./ResellerData";

export const FaqSection = () => (
  <section className="py-32 px-4 bg-[#050505]">
    <div className="container mx-auto max-w-3xl">
      <motion.div {...FADE_IN_VARIANTS} className="mb-16">
         <h2 className="text-3xl font-bold tracking-tight mb-2">Perguntas Essenciais</h2>
         <p className="text-zinc-500 font-light">Transparência absoluta em cada etapa.</p>
      </motion.div>

      <div className="space-y-3">
        {FAQ_DATA.map((item, idx) => (
          <motion.div
            key={idx}
            {...FADE_IN_VARIANTS}
            className="group bg-[#0a0a0a] border border-zinc-900/50 rounded-3xl overflow-hidden hover:border-zinc-700 transition-colors"
          >
            <details className="group">
              <summary className="flex items-center justify-between p-8 cursor-pointer list-none">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors" />
                  <span className="font-bold text-lg text-zinc-300 group-hover:text-white transition-colors">{item.question}</span>
                </div>
                <div className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center group-open:bg-white group-open:text-black transition-all">
                  <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                </div>
              </summary>
              <div className="px-8 pb-8 text-zinc-500 font-light leading-relaxed">
                {item.answer}
              </div>
            </details>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);
