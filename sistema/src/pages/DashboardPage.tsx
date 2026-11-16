import React from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/MainLayout";
import { Dashboard } from "@/components/Dashboard";
import { DRE } from "@/components/DRE";
import { FinanceCalendarView } from "@/pages/FinanceCalendarPage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = ["geral", "financeiro", "calendario"] as const;
type TabId = (typeof TABS)[number];

const DashboardPage = () => {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  const tab: TabId = (TABS as readonly string[]).includes(raw ?? "") ? (raw as TabId) : "geral";

  const onTab = (value: string) => {
    const next = new URLSearchParams(params);
    if (value === "geral") next.delete("tab");
    else next.set("tab", value);
    setParams(next, { replace: true });
  };

  return (
    <MainLayout>
      <Tabs value={tab} onValueChange={onTab} className="space-y-6">
        <div className="px-1 sm:px-0 overflow-x-auto">
          <TabsList className="h-auto p-1.5 rounded-2xl bg-slate-100/80 inline-flex">
            <TabsTrigger value="geral" className="min-h-[44px] px-5 rounded-xl font-black text-sm">Visão geral</TabsTrigger>
            <TabsTrigger value="financeiro" className="min-h-[44px] px-5 rounded-xl font-black text-sm">Financeiro</TabsTrigger>
            <TabsTrigger value="calendario" className="min-h-[44px] px-5 rounded-xl font-black text-sm">Calendário</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="geral" className="mt-0"><Dashboard /></TabsContent>
        <TabsContent value="financeiro" className="mt-0"><DRE /></TabsContent>
        <TabsContent value="calendario" className="mt-0">
          <FinanceCalendarView />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default DashboardPage;
