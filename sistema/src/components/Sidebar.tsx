import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/cloudStore";
import logo from "@/assets/logo.jfif";
import { useAuth } from "@/hooks/useAuth";
import { getSidebarNav, resolveActiveSection } from "@/lib/navigation";

export const Sidebar = () => {
  const location = useLocation();
  const { isAdmin, isInvestor } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const perms = { isAdmin, isInvestor };
  const navItems = getSidebarNav(perms);
  const activeId = resolveActiveSection(location.pathname, perms);


  return (
    <aside className="w-80 border-r border-slate-100 bg-white flex flex-col h-full shrink-0 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div className="p-10 pb-12">
        <Link to="/" className="flex items-center gap-4 group">
          <div className="relative">
            <div
              className="relative w-14 h-14 transition-transform duration-300 group-hover:rotate-[5deg] group-hover:scale-105 rounded-[1.25rem] overflow-hidden shadow-2xl shadow-primary/20 border border-slate-100"
            >
              <img src={logo} alt="Melhoraço" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-4 border-white rounded-full shadow-sm"></div>
          </div>
          <div className="flex flex-col">
            <span className="font-black text-2xl tracking-tighter text-slate-900 leading-none group-hover:text-primary transition-colors">Melhoraço</span>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mt-1.5 opacity-80">Industrial v2.0</span>
          </div>
        </Link>
      </div>

      <nav aria-label="Navegação principal" className="flex-1 px-6 space-y-1.5 overflow-y-auto scrollbar-hide py-2">
        <p className="px-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mb-4">Módulos do Sistema</p>
        {navItems.map((item) => {
          const isActive = item.id === activeId;
          return (
            <Link
              key={item.id}
              to={item.path}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center justify-between px-4 py-4 rounded-2xl text-[13px] font-black transition-all duration-500 group relative overflow-hidden min-h-[44px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                isActive
                  ? "bg-slate-900 text-white shadow-2xl shadow-slate-200"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >

              <div className="flex items-center gap-4 relative z-10">
                <item.icon className={cn(
                  "w-5 h-5 transition-all duration-500", 
                  isActive ? "text-primary" : "text-slate-400 group-hover:scale-110 group-hover:text-slate-900"
                )} />
                <span className="tracking-tight">{item.label}</span>
              </div>
              {isActive && (
                <div className="absolute inset-0 bg-slate-900 z-0" />
              )}
              <ChevronRight className={cn(
                "w-4 h-4 opacity-0 transition-all duration-300 relative z-10",
                isActive ? "opacity-30" : "group-hover:opacity-10 group-hover:translate-x-1"
              )} />
            </Link>
          );
        })}
      </nav>

      <div className="p-8 mt-auto border-t border-slate-50 bg-slate-50/30">
        <button
          onClick={handleLogout}
          className="flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all w-full group border border-transparent hover:border-red-100/50"
        >
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center transition-colors group-hover:bg-red-500 group-hover:text-white">
            <LogOut className="w-5 h-5" />
          </div>
          <span className="tracking-tight">Encerrar Sessão</span>
        </button>
      </div>
    </aside>
  );
};
