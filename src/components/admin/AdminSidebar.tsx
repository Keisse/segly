import {
  LayoutDashboard,
  KanbanSquare,
  ShieldCheck,
  LogOut,
  Users,
  Handshake,
  Settings,
  Compass,
  UserCircle,
} from "lucide-react";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useMyRole } from "@/hooks/useMyRole";
import { NossoPropositoDialog } from "./NossoPropositoDialog";

const seglyLogo = "/favicon.svg";

type Item = { title: string; url: string; icon: any; adminOnly?: boolean };

const mainItems: Item[] = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Leads", url: "/admin/leads", icon: Users },
  { title: "Pipelines", url: "/admin/kanban", icon: KanbanSquare },
  { title: "Clientes", url: "/admin/clientes", icon: Handshake },
  { title: "Meu Perfil", url: "/admin/meu-perfil", icon: UserCircle },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const { data: role } = useMyRole();
  const isAdmin = role === "admin";
  const navigate = useNavigate();
  const [propositoOpen, setPropositoOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/admin-login");
  };

  const visibleMain = mainItems.filter((i) => !i.adminOnly || isAdmin);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex items-center justify-center border-b border-sidebar-border">
          <img src={seglyLogo} alt="Segly" className={collapsed ? "h-6" : "h-8"} />
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Painel</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "hover:bg-sidebar-accent/50"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="mt-auto p-2 space-y-1">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setPropositoOpen(true)}
                className="hover:bg-sidebar-accent/50"
              >
                <Compass className="h-4 w-4" />
                {!collapsed && <span>Nosso Propósito</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
            {isAdmin && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/admin/administradores"
                    className={({ isActive }) =>
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "hover:bg-sidebar-accent/50"
                    }
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {!collapsed && <span>Usuários e Permissões</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {isAdmin && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/admin/configuracoes"
                    className={({ isActive }) =>
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "hover:bg-sidebar-accent/50"
                    }
                  >
                    <Settings className="h-4 w-4" />
                    {!collapsed && <span>Configurações</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            {!collapsed && "Sair"}
          </Button>
        </div>
      </SidebarContent>
      <NossoPropositoDialog open={propositoOpen} onOpenChange={setPropositoOpen} />
    </Sidebar>
  );
}
