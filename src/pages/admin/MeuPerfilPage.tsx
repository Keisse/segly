import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const MeuPerfilPage = () => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles" as any)
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setDisplayName((data as any).display_name || "");
        setAvatarUrl((data as any).avatar_url || "");
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles" as any)
      .upsert({ id: user.id, display_name: displayName, avatar_url: avatarUrl });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Perfil atualizado");
  };

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Meu Perfil</h1>
        <p className="text-sm text-muted-foreground">Gerencie seus dados e preferências.</p>
      </div>
      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <Label>E-mail</Label>
          <Input value={user?.email || ""} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="display_name">Nome de exibição</Label>
          <Input
            id="display_name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Seu nome"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="avatar_url">URL do avatar</Label>
          <Input
            id="avatar_url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar alterações
        </Button>
      </Card>
    </div>
  );
};

export default MeuPerfilPage;
