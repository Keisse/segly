import { Link } from "react-router-dom";
import { Loader2, ShieldOff } from "lucide-react";
import { useMyRole } from "@/hooks/useMyRole";
import { Button } from "@/components/ui/button";

const AdminOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { data: role, isLoading } = useMyRole();
  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (role !== "admin") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
        <ShieldOff className="w-10 h-10 text-muted-foreground mb-4" />
        <h1 className="text-xl font-semibold">Acesso negado</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          Esta área é restrita a administradores. Fale com o responsável da sua
          operação caso precise de acesso.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/admin/dashboard">Voltar ao painel</Link>
        </Button>
      </div>
    );
  }
  return <>{children}</>;
};

export default AdminOnlyRoute;

