import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Suspense, lazy } from "react";
import { PublicTracking } from "@/components/PublicTracking";
const AuthPage = lazy(() => import("./pages/AuthPage"));
const QuotesList = lazy(() => import("./pages/QuotesList"));
const QuoteFormPage = lazy(() => import("./pages/QuoteFormPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const DREPage = lazy(() => import("./pages/DREPage"));
const ClientsPage = lazy(() => import("./pages/ClientsPage"));
const QuoteViewPage = lazy(() => import("./pages/QuoteViewPage"));
const PublicPage = lazy(() => import("./pages/PublicPage"));

const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const ResellerLP = lazy(() => import("./pages/ResellerLP"));
const PaymentDiagnostics = lazy(() => import("./pages/PaymentDiagnostics"));
const SandboxCheckout = lazy(() => import("./pages/SandboxCheckout"));
const OrderSuccessPage = lazy(() => import("./pages/OrderSuccessPage"));
const FinanceCalendarPage = lazy(() => import("./pages/FinanceCalendarPage"));
const PublicGalleryPage = lazy(() => import("./pages/PublicGalleryPage"));
const AgendaPage = lazy(() => import("./pages/AgendaPage"));
const StorePage = lazy(() => import("./pages/StorePage"));
const StoreProductPage = lazy(() => import("./pages/StoreProductPage"));
const StoreOrdersPage = lazy(() => import("./pages/StoreOrdersPage"));
const StoreAdminPage = lazy(() => import("./pages/StoreAdminPage"));
const StoreTrackPage = lazy(() => import("./pages/StoreTrackPage"));
const PaymentEventsPage = lazy(() => import("./pages/PaymentEventsPage"));
const InvestorPanelPage = lazy(() => import("./pages/InvestorPanelPage"));
const InvestorSalesPage = lazy(() => import("./pages/InvestorSalesPage"));
const InvestorDashboardPage = lazy(() => import("./pages/InvestorDashboardPage"));


import { Loader2 } from "lucide-react";
import { BASE_PATH } from "@/lib/appUrl";
import { useMounted } from "@/hooks/useMounted";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAllowed, isInvestor } = useAuth();
  const mounted = useMounted();

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <AuthPage />;
  
  if (!isAllowed && !isInvestor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground mb-4">Seu acesso ainda não foi liberado.</p>
      </div>
    );
  }

  return <>{children}</>;
};

/** Investidor (sem ser administrador) cai direto no painel de comissão. */
const HomeRoute = () => {
  const { isAdmin, isInvestor } = useAuth();
  if (isInvestor && !isAdmin) return <Navigate to="/investidor" replace />;
  return <QuotesList />;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Sonner position="top-right" />
        <BrowserRouter basename={BASE_PATH}>
          <PublicTracking />
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#050505]">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          }>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/revendedores" element={<ResellerLP />} />
              <Route path="/p/:slug" element={<ErrorBoundary scope="public-page"><PublicPage /></ErrorBoundary>} />
              <Route path="/projetos" element={<ErrorBoundary scope="public-gallery"><PublicGalleryPage /></ErrorBoundary>} />
              <Route path="/sandbox/pay/:quoteId" element={<SandboxCheckout />} />
              <Route path="/pedido/:id/sucesso" element={<OrderSuccessPage />} />
              <Route path="/loja" element={<ErrorBoundary scope="store"><StorePage /></ErrorBoundary>} />
              <Route path="/loja/produto/:id" element={<ErrorBoundary scope="store-product"><StoreProductPage /></ErrorBoundary>} />
              <Route path="/loja/meus-pedidos" element={<ErrorBoundary scope="store-orders"><StoreOrdersPage /></ErrorBoundary>} />
              <Route path="/loja/rastrear" element={<ErrorBoundary scope="store-track"><StoreTrackPage /></ErrorBoundary>} />



              
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/pipeline" element={<Navigate to="/" replace />} />
              <Route path="/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
              <Route path="/production" element={<Navigate to="/" replace />} />
              <Route path="/" element={<ProtectedRoute><HomeRoute /></ProtectedRoute>} />
              <Route path="/investidor" element={<ProtectedRoute><InvestorPanelPage /></ProtectedRoute>} />
              <Route path="/investidor/vendas" element={<ProtectedRoute><InvestorSalesPage /></ProtectedRoute>} />
              <Route path="/investidor/dashboard" element={<ProtectedRoute><InvestorDashboardPage /></ProtectedRoute>} />
              <Route path="/new" element={<ProtectedRoute><QuoteFormPage /></ProtectedRoute>} />
              <Route path="/quotes/:id" element={<ProtectedRoute><QuoteViewPage /></ProtectedRoute>} />
              <Route path="/dre" element={<ProtectedRoute><DREPage /></ProtectedRoute>} />
              <Route path="/financeiro/calendario" element={<ProtectedRoute><FinanceCalendarPage /></ProtectedRoute>} />
              <Route path="/agenda" element={<ProtectedRoute><AgendaPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/diag/payments" element={<ProtectedRoute><PaymentDiagnostics /></ProtectedRoute>} />
              <Route path="/admin/loja" element={<ProtectedRoute><StoreAdminPage /></ProtectedRoute>} />
              <Route path="/admin/pagamentos/eventos" element={<ProtectedRoute><ErrorBoundary scope="payment-events"><PaymentEventsPage /></ErrorBoundary></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
