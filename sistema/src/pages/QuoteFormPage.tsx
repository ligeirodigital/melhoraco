import React from "react";
import { MainLayout } from "@/components/MainLayout";
import QuoteForm from "@/components/QuoteForm";
import { useNavigate, useLocation } from "react-router-dom";

const QuoteFormPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialData = location.state?.duplicateFrom;
  const isEditing = location.state?.isEditing;

  return (
    <MainLayout>
      <div className="w-full max-w-full overflow-x-hidden pb-[max(env(safe-area-inset-bottom),1rem)]">
        <div className="flex items-center gap-2 mb-4">
           <div className={`w-3 h-3 rounded-full ${isEditing ? 'bg-blue-500' : 'bg-primary'} animate-pulse shrink-0`} />
           <h2 className="text-[11px] sm:text-sm font-black text-slate-400 uppercase tracking-widest truncate">
            {isEditing ? "Modo de Edição" : initialData ? "Duplicando Base" : "Nova Proposta"}
          </h2>
        </div>
        <QuoteForm 
          onSaved={(id) => navigate(`/quotes/${id}`)} 
          onBack={() => navigate("/")}
          initialData={initialData}
          isEditing={isEditing}
        />
      </div>
    </MainLayout>
  );
};

export default QuoteFormPage;
