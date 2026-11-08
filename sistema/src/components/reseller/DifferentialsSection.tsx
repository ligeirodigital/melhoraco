import { motion } from "framer-motion";
import { DIFFERENTIALS_DATA, FADE_IN_VARIANTS } from "./ResellerData";

export const DifferentialsSection = () => {
  const differentials = DIFFERENTIALS_DATA("w-6 h-6");
  
  return (
    <section className="py-32 px-4 bg-[#050505]">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {differentials.map((item, idx) => (
            <motion.div 
              key={idx}
              {...FADE_IN_VARIANTS}
              transition={{ ...FADE_IN_VARIANTS.transition, delay: idx * 0.1 }}
              className="p-10 rounded-[2rem] bg-zinc-900/20 border border-zinc-800/50 hover:border-zinc-700 hover:bg-zinc-900/40 transition-all duration-500 group"
            >
              <div className="bg-white/5 w-12 h-12 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-white group-hover:text-black transition-all duration-500">
                {item.icon}
              </div>
              <h3 className="text-lg font-bold mb-3 tracking-tight">{item.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed font-light">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
