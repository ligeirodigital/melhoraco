import { Package, Plus, TrendingUp, TrendingDown, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const InventorySummaryCard = ({ title, value, icon: Icon, trend }: { title: string, value: string | number, icon: any, trend?: string }) => (
  <div className="bg-card border border-border/60 rounded-3xl p-6 shadow-sm">
    <div className="flex justify-between items-start">
      <div className="p-3 bg-muted rounded-2xl text-muted-foreground">
        <Icon className="w-6 h-6" />
      </div>
    </div>
    <div className="mt-4">
      <p className="label-caps opacity-70 mb-1">{title}</p>
      <p className="text-3xl font-black text-foreground">{value}</p>
      {trend && <p className="text-xs font-bold text-muted-foreground mt-1">{trend}</p>}
    </div>
  </div>
);
