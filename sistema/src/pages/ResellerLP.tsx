import { Suspense, lazy } from "react";
import { Helmet } from "react-helmet-async";
import { ResellerNavbar } from "@/components/reseller/ResellerCommon";
import { HeroSection } from "@/components/reseller/HeroSection";

// Lazy load sections below the fold
const ProductShowcase = lazy(() => import("@/components/reseller/ResellerCommon").then(m => ({ default: m.ProductShowcase })));
const PricingTable = lazy(() => import("@/components/reseller/PricingTable").then(m => ({ default: m.PricingTable })));
const DifferentialsSection = lazy(() => import("@/components/reseller/DifferentialsSection").then(m => ({ default: m.DifferentialsSection })));
const SocialProofSection = lazy(() => import("@/components/reseller/SocialProofSection").then(m => ({ default: m.SocialProofSection })));
const FaqSection = lazy(() => import("@/components/reseller/FaqSection").then(m => ({ default: m.FaqSection })));
const FinalCta = lazy(() => import("@/components/reseller/ResellerCommon").then(m => ({ default: m.FinalCta })));
const ResellerFooter = lazy(() => import("@/components/reseller/ResellerFooter").then(m => ({ default: m.ResellerFooter })));

const SectionLoader = () => <div className="h-40 w-full flex items-center justify-center bg-[#050505]" />;

const ResellerLP = () => {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-zinc-100/10 overflow-x-hidden">
      <Helmet>
        <title>Melhoraço Premium | Exclusividade em Aço Inox para Revendedores</title>
        <meta name="description" content="Acesse a tabela exclusiva da Melhoraço. Números residenciais de alto luxo em aço inox AISI 304. O parceiro ideal para arquitetura e design de alto padrão." />
      </Helmet>

      <ResellerNavbar />
      
      <main>
        <HeroSection />
        
        <Suspense fallback={<SectionLoader />}>
          <ProductShowcase />
          <PricingTable />
          <DifferentialsSection />
          <SocialProofSection />
          <FaqSection />
          <FinalCta />
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <ResellerFooter />
      </Suspense>
    </div>
  );
};

export default ResellerLP;
