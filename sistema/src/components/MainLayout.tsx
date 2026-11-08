import React from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex h-[100dvh] w-full max-w-[100vw] bg-[#FDFDFF] text-foreground overflow-hidden font-sans selection:bg-primary/10 selection:text-primary">
      {!isMobile && <Sidebar />}
      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden h-full">
        <div className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden scroll-smooth",
          "scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent",
          isMobile ? "pb-24" : "pb-0"
        )}>
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 h-full p-4 sm:p-6 md:p-10 lg:p-12 max-w-[1800px] mx-auto w-full">
            {children}
          </div>
        </div>
        {isMobile && <BottomNav />}
      </main>
    </div>
  );
};
