import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { UserMenu } from "@/components/admin/UserMenu";
import { PrincipioAutoOpener } from "@/components/admin/PrincipioAutoOpener";
import { useLeadRealtime } from "@/hooks/useLeadRealtime";

const AdminLayout = () => {
  useLeadRealtime();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b border-border bg-background/50 backdrop-blur px-2">
            <SidebarTrigger className="ml-2" />
            <div className="pr-3">
              <UserMenu />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
        <PrincipioAutoOpener />
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;

