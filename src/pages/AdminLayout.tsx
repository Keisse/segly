import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { UserMenu } from "@/components/admin/UserMenu";
import { AceleraAlerts } from "@/components/admin/AceleraAlerts";
import { PrincipioAutoOpener } from "@/components/admin/PrincipioAutoOpener";
import { NextPaymentBanner } from "@/components/admin/NextPaymentBanner";
import { useLeadRealtime } from "@/hooks/useLeadRealtime";
import { useCelebrationListener } from "@/hooks/useCelebrationListener";

const AdminLayout = () => {
  useLeadRealtime();
  useCelebrationListener();
  const location = useLocation();
  const showNextPayment = location.pathname === "/admin/produtividade";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full min-w-0 overflow-hidden">
        <AdminSidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="h-14 shrink-0 flex items-center justify-between border-b border-border bg-background/50 backdrop-blur px-2 sm:px-3">
            <SidebarTrigger className="ml-0 sm:ml-1" />
            <div className="min-w-0 pr-1 sm:pr-2 flex items-center gap-1">
              <AceleraAlerts />
              <UserMenu />
            </div>
          </header>
          <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto">
            {showNextPayment && <NextPaymentBanner />}
            <Outlet />
          </main>
        </div>
        <PrincipioAutoOpener />
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
