import { Button } from "./ui/button";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { Shield } from "lucide-react";

export const CookieConsent = () => {
  const { consent, accept, decline } = useCookieConsent();

  if (consent !== null) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-in slide-in-from-bottom-full duration-500">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-left">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-slate-900" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-slate-900 leading-tight">Privacidade & Cookies</p>
            <p className="text-xs text-slate-500 font-medium max-w-lg">
              Utilizamos cookies para melhorar sua experiência e analisar o tráfego. Ao continuar, você concorda com nossa política de privacidade.
            </p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="ghost" onClick={decline} className="flex-1 md:flex-none h-12 text-slate-500 font-bold px-8">
            RECUSAR
          </Button>
          <Button onClick={accept} className="flex-1 md:flex-none h-12 bg-slate-900 text-white font-black px-10 rounded-xl">
            ACEITAR TUDO
          </Button>
        </div>
      </div>
    </div>
  );
};
