import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, UserMinus, KeyRound, Loader2, UserPlus, WalletCards } from "lucide-react";
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
type CompensationRow = { user_id: string; organization_id: string; base_salary: number | string };
type ProfileOrgRow = { id: string; organization_id: string | null };

const roleLabels: Record<Role, string> = { admin: "Administrador", lider: "Líder", user: "Usuário" };
const MIN_SLOTS: Record<Role, number> = { admin: 1, lider: 1, user: 2 };
type Slot = { kind: "filled"; role: Role; user: AdminUser } | { kind: "empty"; role: Role };

function formatMoney(value: number | string | undefined) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number.isFinite(n) ? n : 0);
}

const AdministradoresPage = () => {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [createRole, setCreateRole] = useState<Role>("user");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [liderId, setLiderId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<Role>("user");
  const [editLiderId, setEditLiderId] = useState("");
  const [editSalary, setEditSalary] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [resettingPwd, setResettingPwd] = useState(false);

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ["admins-list"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-admins", { body: { action: "list" } });
      if (error) throw error;
      return (data?.admins || []) as AdminUser[];
    },
  });

  const { data: compensation = [] } = useQuery({
    queryKey: ["admin-compensation-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("compensation_profiles" as never).select("user_id,organization_id,base_salary");
      if (error) throw error;
      return (data ?? []) as unknown as CompensationRow[];
    },
  });

  const { data: profileOrgs = [] } = useQuery({
    queryKey: ["admin-profile-organizations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,organization_id");
      if (error) throw error;
      return (data ?? []) as ProfileOrgRow[];
    },
  });

  const leaders = admins.filter((a) => a.role === "lider");
  const salaryMap = useMemo(() => new Map(compensation.map((row) => [row.user_id, Number(row.base_salary || 0)])), [compensation]);
  const orgMap = useMemo(() => new Map(profileOrgs.map((row) => [row.id, row.organization_id])), [profileOrgs]);

  const slots: Slot[] = useMemo(() => {
    const out: Slot[] = [];
    (["admin", "lider", "user"] as Role[]).forEach((role) => {
      const users = admins.filter((u) => u.role === role);
      users.forEach((u) => out.push({ kind: "filled", role, user: u }));
      for (let i = 0; i < Math.max(0, MIN_SLOTS[role] - users.length); i++) out.push({ kind: "empty", role });
    });
    return out;
  }, [admins]);

  const openCreate = (role: Role) => {
    setCreateRole(role); setEmail(""); setDisplayName(""); setPassword(""); setLiderId(""); setCreateOpen(true);
  };

  const openEdit = (user: AdminUser) => {
    setEditUser(user);
    setEditEmail(user.email);
    setEditName(user.display_name || "");
    setEditRole(user.role);
    setEditLiderId(user.lider_id || "");
    setEditSalary(String(salaryMap.get(user.id) ?? 0));
    setNewPassword("");
  };

  const handleCreate = async () => {
    if (!email || !password) return toast.error("Preencha e-mail e senha");
    if (createRole === "user" && !liderId) return toast.error("Selecione o líder responsável pelo novo liderado.");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-admins", { body: { action: "create", email, password, role: createRole, displayName: displayName || null, liderId: createRole === "user" ? liderId : null } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Usuário cadastrado");
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ["admins-list"] });
      qc.invalidateQueries({ queryKey: ["admin-profile-organizations"] });
    } catch (e: any) { toast.error(e.message); } finally { setSubmitting(false); }
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    if (editRole === "user" && !editLiderId) return toast.error("Selecione o líder responsável por este liderado.");
    const salary = Number(String(editSalary).replace(",", "."));
    if (!Number.isFinite(salary) || salary < 0) return toast.error("Informe um salário-base válido.");
    const organizationId = orgMap.get(editUser.id);
    if (!organizationId) return toast.error("Não foi possível identificar a organização deste usuário.");

    setSavingEdit(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-admins", { body: { action: "update_user", userId: editUser.id, email: editEmail, displayName: editName || null, role: editRole, liderId: editRole === "user" ? editLiderId : null } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const { error: salaryError } = await supabase.from("compensation_profiles" as never).upsert({ user_id: editUser.id, organization_id: organizationId, base_salary: salary, updated_at: new Date().toISOString() } as never, { onConflict: "user_id" });
      if (salaryError) throw salaryError;

      toast.success("Dados e remuneração atualizados");
      setEditUser(null);
      qc.invalidateQueries({ queryKey: ["admins-list"] });
      qc.invalidateQueries({ queryKey: ["admin-compensation-profiles"] });
      qc.invalidateQueries({ queryKey: ["audit-events"] });
      qc.invalidateQueries({ queryKey: ["productivity"] });
    } catch (e: any) { toast.error(e.message); } finally { setSavingEdit(false); }
  };

  const handleResetPassword = async () => {
    if (!editUser) return;
    if (!newPassword || newPassword.length < 8) return toast.error("A senha deve ter no mínimo 8 caracteres");
    setResettingPwd(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-admins", { body: { action: "reset_password", userId: editUser.id, password: newPassword } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Senha redefinida"); setNewPassword("");
    } catch (e: any) { toast.error(e.message); } finally { setResettingPwd(false); }
  };

  const remove = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("manage-admins", { body: { action: "remove", userId } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => { toast.success("Vaga liberada"); qc.invalidateQueries({ queryKey: ["admins-list"] }); qc.invalidateQueries({ queryKey: ["admin-compensation-profiles"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-display font-bold">Usuários e Permissões do Sistema</h1><p className="text-sm text-muted-foreground">Gerencie papéis, liderança, acesso e remuneração-base dos usuários.</p></div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Papel</TableHead><TableHead>Salário-base</TableHead><TableHead>Cadastro</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Carregando...</TableCell></TableRow>}
            {!isLoading && slots.map((slot, idx) => slot.kind === "filled" ? (
              <TableRow key={slot.user.id}>
                <TableCell className="font-medium">{slot.user.display_name || <span className="text-muted-foreground italic">Sem nome</span>}</TableCell>
                <TableCell className="text-sm">{slot.user.email}</TableCell>
                <TableCell><Badge variant="secondary">{roleLabels[slot.role]}</Badge></TableCell>
                <TableCell className="text-sm font-medium">{formatMoney(salaryMap.get(slot.user.id))}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(slot.user.created_at).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell className="text-right"><div className="flex items-center justify-end gap-2"><Button size="sm" variant="outline" onClick={() => openEdit(slot.user)}><Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar Dados</Button><Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => { if (confirm(`Liberar a vaga de ${slot.user.email}? Isso remove o usuário do sistema.`)) remove.mutate(slot.user.id); }}><UserMinus className="h-3.5 w-3.5 mr-1.5" /> Liberar Vaga</Button></div></TableCell>
              </TableRow>
            ) : (
              <TableRow key={`empty-${slot.role}-${idx}`} className="bg-muted/30"><TableCell className="italic text-muted-foreground">Vaga disponível</TableCell><TableCell className="italic text-muted-foreground">Vaga disponível</TableCell><TableCell><Badge variant="outline">{roleLabels[slot.role]}</Badge></TableCell><TableCell className="text-muted-foreground">—</TableCell><TableCell className="text-muted-foreground">—</TableCell><TableCell className="text-right"><Button size="sm" onClick={() => openCreate(slot.role)}><UserPlus className="h-3.5 w-3.5 mr-1.5" /> Preencher vaga</Button></TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="flex justify-end"><Button variant="outline" onClick={() => openCreate("user")}><UserPlus className="h-4 w-4 mr-2" /> Adicionar usuário extra</Button></div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent><DialogHeader><DialogTitle>Preencher vaga — {roleLabels[createRole]}</DialogTitle><DialogDescription>Cadastre um novo usuário para esta vaga.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Nome</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nome do usuário" /></div>
            <div className="space-y-1"><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="space-y-1"><Label>Senha (mín. 8 caracteres)</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <div className="space-y-1"><Label>Papel</Label><Select value={createRole} onValueChange={(v) => { setCreateRole(v as Role); if (v !== "user") setLiderId(""); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="user">Usuário</SelectItem><SelectItem value="lider">Líder</SelectItem><SelectItem value="admin">Administrador</SelectItem></SelectContent></Select></div>
            {createRole === "user" && <div className="space-y-1"><Label>Líder responsável *</Label>{leaders.length > 0 ? <Select value={liderId} onValueChange={setLiderId}><SelectTrigger><SelectValue placeholder="Selecione quem lidera este usuário" /></SelectTrigger><SelectContent>{leaders.map((l) => <SelectItem key={l.id} value={l.id}>{l.display_name || l.email}</SelectItem>)}</SelectContent></Select> : <p className="text-sm text-destructive">Cadastre um usuário com papel Líder antes de adicionar um liderado.</p>}<p className="text-xs text-muted-foreground">Todo liderado precisa estar vinculado a um líder.</p></div>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button><Button onClick={handleCreate} disabled={submitting || (createRole === "user" && leaders.length === 0)}>{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Cadastrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Editar Dados</DialogTitle><DialogDescription>Atualize dados, papel, liderança, remuneração-base ou senha.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1"><Label>Nome</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div className="space-y-1"><Label>E-mail</Label><Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} /></div>
            <div className="space-y-1"><Label>Papel</Label><Select value={editRole} onValueChange={(v) => { setEditRole(v as Role); if (v !== "user") setEditLiderId(""); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="user">Usuário</SelectItem><SelectItem value="lider">Líder</SelectItem><SelectItem value="admin">Administrador</SelectItem></SelectContent></Select></div>
            {editRole === "user" && <div className="space-y-1"><Label>Líder responsável *</Label><Select value={editLiderId} onValueChange={setEditLiderId}><SelectTrigger><SelectValue placeholder="Selecione quem lidera este usuário" /></SelectTrigger><SelectContent>{leaders.filter((l) => l.id !== editUser?.id).map((l) => <SelectItem key={l.id} value={l.id}>{l.display_name || l.email}</SelectItem>)}</SelectContent></Select></div>}

            <div className="pt-4 border-t space-y-2"><div className="flex items-center gap-2"><WalletCards className="h-4 w-4 text-muted-foreground" /><Label className="m-0">Salário-base mensal</Label></div><Input type="number" min="0" step="0.01" value={editSalary} onChange={(e) => setEditSalary(e.target.value)} placeholder="0,00" /><p className="text-xs text-muted-foreground">Este valor alimenta os cálculos de remuneração e produtividade do colaborador.</p></div>

            <div className="pt-4 border-t space-y-2"><div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-muted-foreground" /><Label className="m-0">Resetar senha</Label></div><div className="flex gap-2"><Input type="password" placeholder="Nova senha (mín. 8 caracteres)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /><Button variant="secondary" onClick={handleResetPassword} disabled={resettingPwd}>{resettingPwd && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Redefinir</Button></div><p className="text-xs text-muted-foreground">A nova senha é definida imediatamente. Informe-a ao usuário por um canal seguro.</p></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button><Button onClick={handleSaveEdit} disabled={savingEdit}>{savingEdit && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdministradoresPage;