import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useMyRole } from "@/hooks/useMyRole";

type Props = { children: ReactNode };

export default function LeaderOnlyRoute({ children }: Props) {
  const { data: role, isLoading } = useMyRole();
  if (isLoading) return null;
  if (role !== "admin" && role !== "lider") return <Navigate to="/admin/agenda" replace />;
  return <>{children}</>;
}
