import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, User, MapPin, KeyRound, Eye, EyeOff, Sparkles, BookmarkCheck, Trash2 } from "lucide-react";
import { usePrinciplePrefs, useSavedPrinciples, useSavePrinciple } from "@/hooks/usePrinciple";
import { PrincipioDoDiaDialog } from "@/components/admin/PrincipioDoDiaDialog";


type Profile = {
  display_name: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  genero: string | null;
  profissao: string | null;
  cpf: string | null;
  rg: string | null;
  cep: string | null;
  numero: string | null;
  rua: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  pais: string | null;
};

const empty: Profile = {
  display_name: "", telefone: "", data_nascimento: "", genero: "", profissao: "",
  cpf: "", rg: "", cep: "", numero: "", rua: "", complemento: "",
  bairro: "", cidade: "", estado: "", pais: "Brasil",
};

const MeuPerfilPage = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

  const initials = useMemo(() => {
    const source = profile.display_name || user?.email || "";
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?";
  }, [profile.display_name, user?.email]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles" as any)
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (data) setProfile({ ...empty, ...(data as any) });
      setLoading(false);
    })();
  }, [user]);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) =>
    setProfile((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!user) return;
    if (!profile.display_name?.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!profile.telefone?.trim()) {
      toast.error("Número de telefone é obrigatório");
      return;
    }
    setSaving(true);
    const payload: any = { id: user.id, ...profile };
    if (!payload.data_nascimento) payload.data_nascimento = null;
    const { error } = await supabase.from("profiles" as any).upsert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Perfil atualizado");
  };

  const changePassword = async () => {
    if (!user) return;
    if (newPassword.length < 6) return toast.error("A nova senha precisa ter no mínimo 6 caracteres");
    if (newPassword !== confirmPassword) return toast.error("As senhas não coincidem");
    if (!currentPassword) return toast.error("Informe sua senha atual");

    setChangingPass(true);
    // Re-authenticate to validate current password
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });
    if (signInErr) {
      setChangingPass(false);
      return toast.error("Senha atual incorreta");
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPass(false);
    if (error) return toast.error(error.message);
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    toast.success("Senha redefinida com sucesso");
  };

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground">Gerencie seus dados pessoais, endereço e senha.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        {/* Avatar column */}
        <Card className="p-6 flex flex-col items-center text-center h-fit">
          <p className="text-sm font-medium mb-3">Foto do perfil</p>
          <div className="h-28 w-28 rounded-full bg-primary/15 flex items-center justify-center text-3xl font-semibold text-primary">
            {initials}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Suas iniciais são geradas automaticamente a partir do nome completo.
          </p>
        </Card>

        {/* Basic info */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <User className="h-4 w-4 text-primary" />
            Informações Básicas
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={profile.display_name || ""} onChange={(e) => set("display_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input value={user?.email || ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Número de telefone *</Label>
              <Input value={profile.telefone || ""} onChange={(e) => set("telefone", e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-1.5">
              <Label>Data de nascimento</Label>
              <Input type="date" value={profile.data_nascimento || ""} onChange={(e) => set("data_nascimento", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Gênero</Label>
              <Select value={profile.genero || ""} onValueChange={(v) => set("genero", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                  <SelectItem value="prefiro_nao_dizer">Prefiro não dizer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Profissão</Label>
              <Input value={profile.profissao || ""} onChange={(e) => set("profissao", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>CPF</Label>
              <Input value={profile.cpf || ""} onChange={(e) => set("cpf", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>RG</Label>
              <Input value={profile.rg || ""} onChange={(e) => set("rg", e.target.value)} />
            </div>
          </div>
        </Card>
      </div>

      {/* Address */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MapPin className="h-4 w-4 text-primary" />
          Endereço
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>CEP</Label>
            <Input value={profile.cep || ""} onChange={(e) => set("cep", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Número</Label>
            <Input value={profile.numero || ""} onChange={(e) => set("numero", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Rua</Label>
            <Input value={profile.rua || ""} onChange={(e) => set("rua", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Complemento</Label>
            <Input value={profile.complemento || ""} onChange={(e) => set("complemento", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Bairro</Label>
            <Input value={profile.bairro || ""} onChange={(e) => set("bairro", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Cidade</Label>
            <Input value={profile.cidade || ""} onChange={(e) => set("cidade", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Input value={profile.estado || ""} onChange={(e) => set("estado", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>País</Label>
            <Input value={profile.pais || ""} onChange={(e) => set("pais", e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar alterações
          </Button>
        </div>
      </Card>

      {/* Password */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="h-4 w-4 text-primary" />
          Redefinir minha senha
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Senha atual</Label>
            <Input
              type={showPasswords ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nova senha</Label>
            <Input
              type={showPasswords ? "text" : "password"}
              placeholder="Mínimo 6 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Confirmar nova senha</Label>
            <Input
              type={showPasswords ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setShowPasswords((s) => !s)}
            className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground"
          >
            {showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showPasswords ? "Ocultar senhas" : "Mostrar senhas"}
          </button>
          <Button onClick={changePassword} disabled={changingPass}>
            {changingPass && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <KeyRound className="h-4 w-4 mr-2" />
            Redefinir senha
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default MeuPerfilPage;
