import type { ReactNode } from "react";
import { Loader2, ShieldOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useMyRole } from "@/hooks/useMyRole";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };

export default function LeaderOnlyRoute({ children }: Props) {
  const { data: role, isLoading, isFetching, error } = useMyRole();

  if (isLoading || isFetching || !role) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || (role !== "admin" && role !== "lider")) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
        <ShieldOff className="w-10 h-10 text-muted-foreground mb-4" />
        <h1 className="text-xl font-semibold">Acesso não disponível</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          Esta área é destinada a líderes e administradores. Se você deveria ter acesso, atualize a página ou confira seu perfil em Usuários e Permissões.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/admin/dashboard">Voltar ao Dashboard</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
