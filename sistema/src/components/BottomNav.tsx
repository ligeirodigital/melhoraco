import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MoreHorizontal, LogOut, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import {
  getPrimaryNav,
  getSecondaryNav,
  resolveActiveSection,
} from "@/lib/navigation";

const tap = () => {
  if (typeof window !== "undefined" && window.navigator?.vibrate) {
    window.navigator.vibrate(8);
  }
};

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const perms = { isAdmin };
  const primary = getPrimaryNav(perms);
  const secondary = getSecondaryNav(perms);
  const activeId = resolveActiveSection(location.pathname, perms);
  const moreActive = secondary.some((item) => item.id === activeId);

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-slate-100 flex items-stretch justify-around px-2 z-50 md:hidden pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_40px_rgba(0,0,0,0.04)]"
      >
        {primary.map((item) => {
          const isActive = item.id === activeId;
          const special = item.id === "novo";
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              to={item.path}
              onClick={tap}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              className={cn(
                "flex flex-col items-center justify-center min-w-[56px] min-h-[56px] flex-1 gap-1 py-2 rounded-2xl transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                special ? "relative -top-6 flex-none" : "",
              )}
            >
              {special ? (
                <span
                  className="w-14 h-14 transition-transform duration-150 active:scale-[0.92] rounded-[1.25rem] bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-900/20 ring-4 ring-white"
                >
                  <Plus className="w-7 h-7 stroke-[3px]" aria-hidden="true" />
                </span>
              ) : (
                <Icon
                  className={cn("w-6 h-6 shrink-0", isActive ? "text-primary" : "text-slate-400")}
                  aria-hidden="true"
                />
              )}
              <span
                className={cn(
                  "text-[9px] font-black uppercase tracking-[0.12em]",
                  isActive ? "text-primary" : "text-slate-400",
                  special && "sr-only",
                )}
              >
                {item.shortLabel ?? item.label}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => {
            tap();
            setMoreOpen(true);
          }}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          aria-label="Mais módulos"
          className={cn(
            "flex flex-col items-center justify-center min-w-[56px] min-h-[56px] flex-1 gap-1 py-2 rounded-2xl transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          )}
        >
          <MoreHorizontal
            className={cn("w-6 h-6 shrink-0", moreActive ? "text-primary" : "text-slate-400")}
            aria-hidden="true"
          />
          <span
            className={cn(
              "text-[9px] font-black uppercase tracking-[0.12em]",
              moreActive ? "text-primary" : "text-slate-400",
            )}
          >
            Mais
          </span>
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl max-h-[85dvh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),1rem)]"
        >
          <SheetHeader className="text-left">
            <SheetTitle>Mais módulos</SheetTitle>
            <SheetDescription>Acesse os demais módulos do sistema.</SheetDescription>
          </SheetHeader>
          <nav aria-label="Módulos secundários" className="mt-4 grid grid-cols-2 gap-2">
            {secondary.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activeId;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setMoreOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 min-h-[56px] px-4 py-3 rounded-2xl border text-sm font-bold transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    isActive
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-100 hover:bg-slate-50",
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span className="leading-tight">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={async () => {
              setMoreOpen(false);
              await signOut();
              navigate("/auth");
            }}
            className="mt-3 w-full min-h-[52px] flex items-center justify-center gap-2 rounded-2xl border border-destructive/20 text-destructive font-bold text-sm hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
          >
            <LogOut className="w-5 h-5" aria-hidden="true" />
            Encerrar sessão
          </button>
        </SheetContent>
      </Sheet>
    </>
  );
};
