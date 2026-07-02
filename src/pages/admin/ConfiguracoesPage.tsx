import { useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, Save, Upload, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

const TIMEZONES = [
  "America/Sao_Paulo",
  "America/Bahia",
  "America/Fortaleza",
  "America/Recife",
  "America/Manaus",
  "America/Cuiaba",
  "America/Rio_Branco",
  "America/Noronha",
  "UTC",
];

type OrgRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  timezone: string;
  logo_url: string | null;
};

type SettingsRow = {
  organization_id: string;
  default_lead_owner: string | null;
  track_change_history: boolean;
  in_app_notifications: boolean;
  email_notifications: boolean;
  inactive_lead_reminder_days: number;
};

type ProfileOption = { id: string; display_name: string | null };

const useOrganization = () =>
  useQuery({
    queryKey: ["organization"],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", (await supabase.auth.getUser()).data.user!.id)
        .maybeSingle();
      const orgId = (profile as { organization_id: string | null } | null)?.organization_id;
      if (!orgId) throw new Error("Organização não encontrada.");
      const [{ data: org }, { data: settings }, { data: members }] = await Promise.all([
        supabase.from("organizations" as never).select("*").eq("id", orgId).maybeSingle(),
        supabase.from("organization_settings" as never).select("*").eq("organization_id", orgId).maybeSingle(),
        supabase.from("profiles").select("id, display_name").eq("organization_id", orgId),
      ]);
      return {
        org: org as unknown as OrgRow,
        settings: (settings as unknown as SettingsRow) ?? {
          organization_id: orgId,
          default_lead_owner: null,
          track_change_history: true,
          in_app_notifications: true,
          email_notifications: true,
          inactive_lead_reminder_days: 7,
        },
        members: (members ?? []) as ProfileOption[],
      };
    },
  });


const GeralTab = ({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) => {
  const qc = useQueryClient();
  const { data, isLoading } = useOrganization();
  const [form, setForm] = useState<OrgRow | null>(null);
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const initial = useRef<string>("");

  useEffect(() => {
    if (data) {
      setForm(data.org);
      setSettings(data.settings);
      setLogoPreview(data.org.logo_url);
      initial.current = JSON.stringify({ org: data.org, settings: data.settings });
    }
  }, [data]);

  const dirty = useMemo(() => {
    if (!form || !settings) return false;
    return (
      JSON.stringify({ org: form, settings }) !== initial.current || !!pendingFile
    );
  }, [form, settings, pendingFile]);

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  if (isLoading || !form || !settings) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("O arquivo precisa ser uma imagem.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Tamanho máximo do logo: 2MB.");
      return;
    }
    setPendingFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const save = async () => {
    setSaving(true);
    try {
      let logoUrl = form.logo_url;
      if (pendingFile) {
        const ext = pendingFile.name.split(".").pop() ?? "png";
        const path = `${form.id}/logo-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("organization-logos")
          .upload(path, pendingFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: signed } = await supabase.storage
          .from("organization-logos")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        logoUrl = signed?.signedUrl ?? path;
      }

      const { error: orgErr } = await supabase
        .from("organizations" as never)
        .update({
          name: form.name,
          email: form.email,
          phone: form.phone,
          city: form.city,
          state: form.state,
          timezone: form.timezone,
          logo_url: logoUrl,
        } as never)
        .eq("id", form.id);
      if (orgErr) throw orgErr;

      const { error: setErr } = await supabase
        .from("organization_settings" as never)
        .upsert({
          organization_id: form.id,
          default_lead_owner: settings.default_lead_owner,
          track_change_history: settings.track_change_history,
          in_app_notifications: settings.in_app_notifications,
          email_notifications: settings.email_notifications,
          inactive_lead_reminder_days: settings.inactive_lead_reminder_days,
        } as never);
      if (setErr) throw setErr;

      await supabase.from("audit_log" as never).insert({
        organization_id: form.id,
        actor_id: (await supabase.auth.getUser()).data.user!.id,
        action: "update_general_settings",
        entity: "organization",
        entity_id: form.id,
        new_value: { org: form, settings } as never,
      } as never);

      setPendingFile(null);
      initial.current = JSON.stringify({
        org: { ...form, logo_url: logoUrl },
        settings,
      });
      setForm({ ...form, logo_url: logoUrl });
      qc.invalidateQueries({ queryKey: ["organization"] });
      toast.success("Configurações salvas com sucesso.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Dados da operação */}
      <Card>
        <CardHeader>
          <CardTitle>Dados da operação</CardTitle>
          <CardDescription>
            Informações básicas exibidas em relatórios, e-mails e documentos.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2 flex items-center gap-4">
            <div className="w-20 h-20 rounded-lg border border-border bg-muted/30 flex items-center justify-center overflow-hidden">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" /> Enviar logo
              </Button>
              <p className="text-xs text-muted-foreground">PNG, JPG ou SVG até 2MB.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-name">Nome da corretora / empresa</Label>
            <Input
              id="org-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-email">E-mail principal</Label>
            <Input
              id="org-email"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-phone">Telefone principal</Label>
            <Input
              id="org-phone"
              value={form.phone ?? ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="org-city">Cidade</Label>
              <Input
                id="org-city"
                value={form.city ?? ""}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-state">UF</Label>
              <Input
                id="org-state"
                maxLength={2}
                value={form.state ?? ""}
                onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
              />
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="org-tz">Fuso horário</Label>
            <Select
              value={form.timezone}
              onValueChange={(v) => setForm({ ...form, timezone: v })}
            >
              <SelectTrigger id="org-tz"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Preferências */}
      <Card>
        <CardHeader>
          <CardTitle>Preferências do sistema</CardTitle>
          <CardDescription>
            Comportamentos padrão aplicados a toda a operação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Responsável padrão para leads sem atribuição</Label>
            <Select
              value={settings.default_lead_owner ?? "__none__"}
              onValueChange={(v) =>
                setSettings({ ...settings, default_lead_owner: v === "__none__" ? null : v })
              }
            >
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {data?.members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.display_name ?? m.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Histórico de alterações importantes</p>
              <p className="text-xs text-muted-foreground">
                Registra mudanças administrativas para auditoria.
              </p>
            </div>
            <Switch
              checked={settings.track_change_history}
              onCheckedChange={(v) => setSettings({ ...settings, track_change_history: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notificações */}
      <Card>
        <CardHeader>
          <CardTitle>Notificações gerais</CardTitle>
          <CardDescription>
            Cada usuário poderá refinar suas próprias preferências em Meu Perfil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Notificações dentro do sistema</p>
              <p className="text-xs text-muted-foreground">Alertas exibidos no painel.</p>
            </div>
            <Switch
              checked={settings.in_app_notifications}
              onCheckedChange={(v) => setSettings({ ...settings, in_app_notifications: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Notificações por e-mail</p>
              <p className="text-xs text-muted-foreground">
                Resumos e avisos enviados para o e-mail cadastrado.
              </p>
            </div>
            <Switch
              checked={settings.email_notifications}
              onCheckedChange={(v) => setSettings({ ...settings, email_notifications: v })}
            />
          </div>
          <Separator />
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="inactive-days">Lembrete de leads sem interação (dias)</Label>
            <Input
              id="inactive-days"
              type="number"
              min={1}
              max={365}
              value={settings.inactive_lead_reminder_days}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  inactive_lead_reminder_days: Number(e.target.value) || 1,
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end sticky bottom-4">
        <Button onClick={save} disabled={!dirty || saving} className="shadow-lg">
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando…</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Salvar alterações</>
          )}
        </Button>
      </div>
    </div>
  );
};

const ComingSoon = ({ title, description }: { title: string; description: string }) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">
        Módulo em desenvolvimento — será liberado nas próximas versões, mantendo
        a mesma identidade visual do Segly.
      </p>
    </CardContent>
  </Card>
);

const ConfiguracoesPage = () => {
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState("geral");
  const { confirmDiscard } = useUnsavedChanges(dirty);

  const changeTab = (next: string) => {
    if (dirty && !confirmDiscard()) return;
    setDirty(false);
    setTab(next);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie as regras, preferências e integrações da operação.
        </p>
      </div>

      <Tabs value={tab} onValueChange={changeTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 justify-start">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="celebracoes">Celebrações</TabsTrigger>
          <TabsTrigger value="automacoes">Automações</TabsTrigger>
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-4">
          <GeralTab onDirtyChange={setDirty} />
        </TabsContent>
        <TabsContent value="pipeline" className="mt-4">
          <ComingSoon
            title="Configurações de Pipeline"
            description="Aqui você define as regras e padrões das pipelines. Para acompanhar e movimentar oportunidades, acesse Pipelines no menu principal."
          />
        </TabsContent>
        <TabsContent value="celebracoes" className="mt-4">
          <ComingSoon
            title="Celebrações e Reconhecimento"
            description="Reconhecer conquistas ajuda a equipe a perceber progresso, manter a constância e celebrar resultados construídos com responsabilidade."
          />
        </TabsContent>
        <TabsContent value="automacoes" className="mt-4">
          <ComingSoon
            title="Automações"
            description="Configure ações automáticas sem necessidade de integrações externas."
          />
        </TabsContent>
        <TabsContent value="integracoes" className="mt-4">
          <ComingSoon
            title="Integrações"
            description="Webhooks e conexões com sistemas externos."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConfiguracoesPage;
