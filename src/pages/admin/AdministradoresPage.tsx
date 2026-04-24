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
import { UserPlus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const AdministradoresPage = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: admins, isLoading } = useQuery({
    queryKey: ["admins-list"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-admins", {
        body: { action: "list" },
      });
      if (error) throw error;
      return (data?.admins || []) as { id: string; email: string; created_at: string }[];
    },
  });

  const handleCreate = async () => {
    if (!email || !password) {
      toast.error("Preencha email e senha");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-admins", {
        body: { action: "create", email, password },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Administrador criado");
      setEmail(""); setPassword(""); setOpen(false);
      qc.invalidateQueries({ queryKey: ["admins-list"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("manage-admins", {
        body: { action: "remove", userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Administrador removido");
      qc.invalidateQueries({ queryKey: ["admins-list"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Administradores</h1>
          <p className="text-sm text-muted-foreground">Gerencie quem tem acesso ao painel.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="h-4 w-4 mr-2" />Novo administrador</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar administrador</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input placeholder="Senha (mín. 8 caracteres)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
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
            <Card key={a.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{a.email}</p>
                <p className="text-xs text-muted-foreground">
                  Desde {new Date(a.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/20 text-primary">Admin</Badge>
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
