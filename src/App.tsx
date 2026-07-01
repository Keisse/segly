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
import KanbanPage from "./pages/admin/KanbanPage";
import PerguntasPage from "./pages/admin/PerguntasPage";
import AdministradoresPage from "./pages/admin/AdministradoresPage";
import BaseConhecimentoPage from "./pages/admin/BaseConhecimentoPage";
import CampanhasPage from "./pages/admin/CampanhasPage";
import CampanhaEditPage from "./pages/admin/CampanhaEditPage";
import CampaignPublicPage from "./pages/CampaignPublicPage";
import LeadDetail from "./pages/LeadDetail";
import ActionPlanPage from "./pages/ActionPlanPage";
import TrackingTemplatePage from "./pages/TrackingTemplatePage";
import OutboundCadastro from "./pages/OutboundCadastro";
import ObrigadaPage from "./pages/ObrigadaPage";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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
          <Route path="/c/:slug" element={<CampaignPublicPage />} />
          <Route path="/admin-login" element={<AdminLogin />} />

          {/* Novo painel admin com sidebar */}
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
            <Route path="kanban" element={<KanbanPage />} />
            <Route path="perguntas" element={<PerguntasPage />} />
            <Route path="base-conhecimento" element={<BaseConhecimentoPage />} />
            <Route path="campanhas" element={<CampanhasPage />} />
            <Route path="campanhas/nova" element={<CampanhaEditPage />} />
            <Route path="campanhas/:id" element={<CampanhaEditPage />} />
            <Route path="administradores" element={<AdministradoresPage />} />
            <Route path="lead/:id" element={<LeadDetail />} />
          </Route>

          {/* Compatibilidade com rotas antigas */}
          <Route path="/admin-dashboard" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin-dashboard/lead/:id" element={<Navigate to="/admin/dashboard" replace />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
