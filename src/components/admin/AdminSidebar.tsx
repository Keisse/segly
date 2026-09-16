import {
  LayoutDashboard,
  KanbanSquare,
  ShieldCheck,
  LogOut,
  Heart,
  Handshake,
  Settings,
  UserCircle,
  UserPlus,
  CalendarCheck2,
  Gauge,
  PauseCircle,
  History,
  Package,
  BookOpen,
} from "lucide-react";
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

const seglyLogoDark = "/segly-logo.png";
const seglyLogoLight = "/segly-logo-light.svg";

type IconProps = { className?: string };

const PulsingHeart = ({ className }: IconProps) => (
  <Heart
    className={`${className ?? ""} segly-heartbeat`}
    aria-hidden="true"
    strokeWidth={1.8}
  />
);

type Item = { title: string; url: string; icon: any; adminOnly?: boolean; leaderOnly?: boolean };

const mainItems: Item[] = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Pipelines", url: "/admin/kanban", icon: KanbanSquare },
  { title: "Vidas", url: "/admin/leads", icon: PulsingHeart },
  { title: "Cadastrar vidas", url: "/admin/leads/novo", icon: UserPlus },
  { title: "Clientes", url: "/admin/clientes", icon: Handshake },
  { title: "Standby", url: "/admin/standby", icon: PauseCircle },
  { title: "Agenda", url: "/admin/atividades", icon: CalendarCheck2 },
  { title: "Produtos", url: "/admin/produtos", icon: Package, adminOnly: true },
  { title: "Desempenho e Comissões", url: "/admin/produtividade", icon: Gauge, leaderOnly: true },
  { title: "Meu Perfil", url: "/admin/meu-perfil", icon: UserCircle },
  { title: "Sobre o sistema", url: "/admin/sobre-o-sistema", icon: BookOpen },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const { data: role } = useMyRole();
  const isAdmin = role === "admin";
  const isLeader = role === "admin" || role === "lider";
  const navigate = useNavigate();
  const logoClass = collapsed ? "h-6" : "h-8";

  const handleLogout = async () => {
    await signOut();
    navigate("/admin-login");
  };

  const visibleMain = mainItems.filter((i) => {
    if (i.adminOnly && !isAdmin) return false;
    if (i.leaderOnly && !isLeader) return false;
    return true;
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex items-center justify-center border-b border-sidebar-border">
          <img src={seglyLogoLight} alt="Segly" className={`${logoClass} max-w-full dark:hidden`} />
          <img src={seglyLogoDark} alt="Segly" className={`${logoClass} max-w-full hidden dark:block`} />
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
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="mt-auto p-2 space-y-1">
          <SidebarMenu>
            {isAdmin && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/admin/administradores" className={({ isActive }) => isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50"}>
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">Usuários e Permissões</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {isLeader && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/admin/auditoria" className={({ isActive }) => isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50"}>
                    <History className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">Log de alterações</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {isAdmin && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/admin/configuracoes" className={({ isActive }) => isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50"}>
                    <Settings className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">Configurações</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2 shrink-0" />
            {!collapsed && "Sair"}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
