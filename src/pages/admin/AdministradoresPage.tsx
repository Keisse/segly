import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UserPlus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Role = "admin" | "lider" | "user";
type AdminUser = {
  id: string;
  email: string;
  created_at: string;
  role: Role;
  lider_id: string | null;
  display_name: string | null;
};

const roleLabels: Record<Role, string> = {
  admin: "Administrador",
  lider: "Líder",
  user: "Usuário",
};

const AdministradoresPage = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [liderId, setLiderId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const { data: admins, isLoading } = useQuery({
    queryKey: ["admins-list"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-admins", {
        body: { action: "list" },
      });
      if (error) throw error;
      return (data?.admins || []) as AdminUser[];
    },
  });

  const leaders = (admins || []).filter((a) => a.role === "admin" || a.role === "lider");

  const handleCreate = async () => {
    if (!email || !password) {
      toast.error("Preencha email e senha");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-admins", {
        body: {
          action: "create",
          email,
          password,
          role,
          liderId: role === "user" ? (liderId || null) : null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Usuário criado");
      setEmail(""); setPassword(""); setRole("user"); setLiderId(""); setOpen(false);
      qc.invalidateQueries({ queryKey: ["admins-list"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole, newLiderId }: { userId: string; newRole: Role; newLiderId: string | null }) => {
      const { data, error } = await supabase.functions.invoke("manage-admins", {
        body: { action: "update_role", userId, role: newRole, liderId: newLiderId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Permissão atualizada");
      qc.invalidateQueries({ queryKey: ["admins-list"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("manage-admins", {
        body: { action: "remove", userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Usuário removido");
      qc.invalidateQueries({ queryKey: ["admins-list"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Usuários e Permissões</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre pessoas, defina o papel (Usuário, Líder ou Administrador) e o líder responsável.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="h-4 w-4 mr-2" />Novo usuário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Senha (mín. 8 caracteres)</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Papel</Label>
                <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="lider">Líder</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {role === "user" && (
                <div className="space-y-1">
                  <Label>Líder responsável</Label>
                  <Select value={liderId} onValueChange={setLiderId}>
                    <SelectTrigger><SelectValue placeholder="Selecione um líder" /></SelectTrigger>
                    <SelectContent>
                      {leaders.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="space-y-2">
          {admins?.map((a) => (
            <Card key={a.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{a.email}</p>
                <p className="text-xs text-muted-foreground">
                  Desde {new Date(a.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={a.role}
                  onValueChange={(v) => updateRole.mutate({ userId: a.id, newRole: v as Role, newLiderId: v === "user" ? a.lider_id : null })}
                >
                  <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="lider">Líder</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
                {a.role === "user" && (
                  <Select
                    value={a.lider_id || ""}
                    onValueChange={(v) => updateRole.mutate({ userId: a.id, newRole: "user", newLiderId: v || null })}
                  >
                    <SelectTrigger className="h-8 w-[180px]"><SelectValue placeholder="Sem líder" /></SelectTrigger>
                    <SelectContent>
                      {leaders.filter((l) => l.id !== a.id).map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Badge variant="secondary">{roleLabels[a.role]}</Badge>
                <Button size="sm" variant="ghost" onClick={() => {
                  if (confirm(`Remover ${a.email}?`)) remove.mutate(a.id);
                }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdministradoresPage;
