import { motion } from "framer-motion";
import { PRICING_DATA, FADE_IN_VARIANTS } from "./ResellerData";

export const PricingTable = () => (
  <section className="py-32 bg-[#080808] px-4 relative">
    <div className="container mx-auto max-w-5xl relative z-10">
      <motion.div {...FADE_IN_VARIANTS} className="text-center mb-24">
        <span className="text-white/40 text-[10px] uppercase tracking-[0.3em] font-semibold mb-4 block">Condições Comerciais</span>
        <h2 className="text-4xl md:text-5xl font-bold mb-4">Escala de Investimento</h2>
        <div className="w-12 h-[1px] bg-white mx-auto mt-8 opacity-20" />
      </motion.div>

      <div className="relative p-[1px] rounded-3xl bg-gradient-to-b from-zinc-700/30 to-transparent overflow-hidden">
        <div className="bg-[#0a0a0a] rounded-[calc(1.5rem-1px)] overflow-hidden">
          {/* Desktop Table */}
          <table className="w-full text-left border-collapse hidden md:table">
            <thead>
              <tr className="border-b border-zinc-900 bg-zinc-900/30">
                <th className="p-8 font-medium text-zinc-500 text-[10px] uppercase tracking-widest">Quantidade</th>
                <th className="p-8 font-medium text-zinc-500 text-[10px] uppercase tracking-widest">Somente Face</th>
                <th className="p-8 font-medium text-zinc-500 text-[10px] uppercase tracking-widest text-right">3D Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/50">
              {PRICING_DATA.map((row, idx) => (
                <motion.tr 
                  key={idx} 
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }}
                  className={`group transition-colors ${row.highlight ? "bg-white/5" : ""}`}
                >
                  <td className="p-8">
                    <span className={`text-base font-medium ${row.highlight ? "text-white" : "text-zinc-400"}`}>{row.qty}</span>
                    {row.highlight && <span className="ml-3 px-2 py-0.5 bg-white text-black text-[9px] font-black uppercase rounded">Top Seller</span>}
                  </td>
                  <td className={`p-8 font-semibold text-lg ${row.highlight ? "text-white" : "text-zinc-300"}`}>{row.face}</td>
                  <td className="p-8 text-right">
                    <span className={`font-bold text-xl ${row.highlight ? "text-white" : "text-zinc-100"}`}>{row["3d"]}</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {/* Mobile Grid Layout */}
          <div className="md:hidden divide-y divide-zinc-900/50">
            {PRICING_DATA.map((row, idx) => (
              <div 
                key={idx} 
                className={`p-6 space-y-4 ${row.highlight ? "bg-white/5" : ""}`}
              >
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-bold uppercase tracking-widest ${row.highlight ? "text-white" : "text-zinc-500"}`}>
                    {row.qty}
                  </span>
                  {row.highlight && (
                    <span className="px-2 py-0.5 bg-white text-black text-[8px] font-black uppercase rounded">
                      Top Seller
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/50">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Somente Face</span>
                    <span className={`text-lg font-bold ${row.highlight ? "text-white" : "text-zinc-300"}`}>{row.face}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-widest block mb-1">3D Premium</span>
                    <span className={`text-lg font-black ${row.highlight ? "text-white" : "text-zinc-100"}`}>{row["3d"]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="text-center mt-12 text-xs text-zinc-600 font-medium tracking-wide">* Valores expressos em R$ unitário. Logística sob consulta.</p>
    </div>
  </section>
);
