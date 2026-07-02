import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useMyRole } from "@/hooks/useMyRole";

const AdminOnlyRoute = ({ children }: { children: React.ReactNode }) => {
  const { data: role, isLoading } = useMyRole();
  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }
  if (role !== "admin") return <Navigate to="/admin/dashboard" replace />;
  return <>{children}</>;
};

export default AdminOnlyRoute;
