import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DiagnosticoPage from "./pages/DiagnosticoPage";
import DiagnosticoDiretoPage from "./pages/DiagnosticoDiretoPage";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLayout from "./pages/AdminLayout";
import KanbanPage from "./pages/admin/KanbanPageEnhanced";
import AdministradoresPage from "./pages/admin/AdministradoresPage";
import LeadDetail from "./pages/LeadDetailEnhanced";
import ActionPlanPage from "./pages/ActionPlanPage";
import TrackingTemplatePage from "./pages/TrackingTemplatePage";
import OutboundCadastro from "./pages/OutboundCadastro";
import ObrigadaPage from "./pages/ObrigadaPage";
import PublicLeadFormPage from "./pages/PublicLeadFormPage";
import SeglyFuturePage from "./pages/SeglyFuturePage";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminOnlyRoute from "./components/AdminOnlyRoute";
import LeaderOnlyRoute from "./components/LeaderOnlyRoute";
import LeadsPage from "./pages/admin/LeadsPage";
import ClientesPage from "./pages/admin/ClientesPage";
import MeuPerfilPage from "./pages/admin/MeuPerfilPage";
import ConfiguracoesPage from "./pages/admin/ConfiguracoesPage";
import NovoLeadPage from "./pages/admin/NovoLeadPage";
import AtividadesPage from "./pages/admin/AtividadesPage";
import ProdutividadePage from "./pages/admin/ProdutividadePage";
import StandbyPage from "./pages/admin/StandbyPage";
import AuditoriaPage from "./pages/admin/AuditoriaPage";
import ProdutosPage from "./pages/admin/ProdutosPage";
import SobreSistemaPage from "./pages/admin/SobreSistemaPage";
import { AuthProvider } from "./hooks/useAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/admin-login" replace />} />
            <Route path="/diagnostico" element={<DiagnosticoPage />} />
            <Route path="/diagnostico-direto" element={<DiagnosticoDiretoPage />} />
            <Route path="/plano-acao" element={<ActionPlanPage />} />
            <Route path="/acompanhamento" element={<TrackingTemplatePage />} />
            <Route path="/mail" element={<OutboundCadastro />} />
            <Route path="/obrigada" element={<ObrigadaPage />} />
            <Route path="/formulario/:formId" element={<PublicLeadFormPage />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/segly-decisor" element={<SeglyFuturePage />} />
            <Route path="/segly-future" element={<Navigate to="/segly-decisor" replace />} />

            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="agenda" element={<Navigate to="/admin/atividades" replace />} />
              <Route path="agenda/item/:id" element={<Navigate to="/admin/atividades" replace />} />
              <Route path="kanban" element={<KanbanPage />} />
              <Route path="standby" element={<StandbyPage />} />
              <Route path="atividades" element={<AtividadesPage />} />
              <Route
                path="produtividade"
                element={
                  <LeaderOnlyRoute>
                    <ProdutividadePage />
                  </LeaderOnlyRoute>
                }
              />
              <Route path="comissoes" element={<Navigate to="/admin/produtividade" replace />} />
              <Route
                path="auditoria"
                element={
                  <LeaderOnlyRoute>
                    <AuditoriaPage />
                  </LeaderOnlyRoute>
                }
              />
              <Route path="leads" element={<LeadsPage />} />
              <Route path="leads/novo" element={<NovoLeadPage />} />
              <Route path="clientes" element={<ClientesPage />} />
              <Route path="meu-perfil" element={<MeuPerfilPage />} />
              <Route path="sobre-o-sistema" element={<SobreSistemaPage />} />
              <Route
                path="produtos"
                element={
                  <AdminOnlyRoute>
                    <ProdutosPage />
                  </AdminOnlyRoute>
                }
              />
              <Route
                path="administradores"
                element={
                  <AdminOnlyRoute>
                    <AdministradoresPage />
                  </AdminOnlyRoute>
                }
              />
              <Route
                path="configuracoes"
                element={
                  <AdminOnlyRoute>
                    <ConfiguracoesPage />
                  </AdminOnlyRoute>
                }
              />
              <Route path="lead/:id" element={<LeadDetail />} />
            </Route>

            <Route path="/admin-dashboard" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin-dashboard/lead/:id" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
