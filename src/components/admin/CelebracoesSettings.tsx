import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, Loader2, PartyPopper } from "lucide-react";

type Trigger = { key: string; label: string; description: string; enabled: boolean };

type CelebrationsCfg = {
  enabled: boolean;
  confetti: boolean;
  sound: boolean;
  show_in_pipeline: boolean;
  show_leaderboard: boolean;
  leaderboard_period: "weekly" | "monthly" | "quarterly";
  message_template: string;
  triggers: Trigger[];
};

const DEFAULT_CFG: CelebrationsCfg = {
  enabled: true,
  confetti: true,
  sound: false,
  show_in_pipeline: true,
  show_leaderboard: true,
  leaderboard_period: "monthly",
  message_template: "🎉 Parabéns, {nome}! Você acabou de {acao}.",
  triggers: [],
};

export function CelebracoesSettings() {
  const qc = useQueryClient();
  const [cfg, setCfg] = useState<CelebrationsCfg>(DEFAULT_CFG);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["org-settings-celebrations"],
    queryFn: async () => {
      const u = await supabase.auth.getUser();
      const { data: prof } = await supabase.from("profiles").select("organization_id").eq("id", u.data.user!.id).maybeSingle();
      const oid = (prof as { organization_id: string | null } | null)?.organization_id ?? null;
      setOrgId(oid);
      if (!oid) return null;
      const { data: row } = await supabase.from("organization_settings" as never).select("settings" as never).eq("organization_id", oid).maybeSingle();
      const s = (row as { settings?: Record<string, unknown> } | null)?.settings ?? {};
      return (s.celebrations as CelebrationsCfg) ?? DEFAULT_CFG;
    },
  });

  useEffect(() => { if (data) setCfg({ ...DEFAULT_CFG, ...data, triggers: data.triggers?.length ? data.triggers : DEFAULT_CFG.triggers }); }, [data]);

  const save = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase.from("organization_settings" as never).select("settings" as never).eq("organization_id", orgId).maybeSingle();
      const current = ((existing as { settings?: Record<string, unknown> } | null)?.settings) ?? {};
      const { error } = await supabase.from("organization_settings" as never).upsert({ organization_id: orgId, settings: { ...current, celebrations: cfg } } as never, { onConflict: "organization_id" });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["org-settings-celebrations"] });
      toast.success("Celebrações salvas.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <PartyPopper className="w-5 h-5 text-primary" />
            <CardTitle>Reconhecimento da equipe</CardTitle>
          </div>
          <CardDescription>Reconhecer conquistas ajuda o time a manter constância e celebrar resultados construídos com responsabilidade.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Ativar celebrações</p>
              <p className="text-xs text-muted-foreground">Ao desligar, nenhuma celebração é acionada.</p>
            </div>
            <Switch checked={cfg.enabled} onCheckedChange={(v) => setCfg({ ...cfg, enabled: v })} />
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <p className="text-sm">Animação de confete</p>
              <Switch checked={cfg.confetti} onCheckedChange={(v) => setCfg({ ...cfg, confetti: v })} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <p className="text-sm">Som ao celebrar</p>
              <Switch checked={cfg.sound} onCheckedChange={(v) => setCfg({ ...cfg, sound: v })} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <p className="text-sm">Mostrar no quadro</p>
              <Switch checked={cfg.show_in_pipeline} onCheckedChange={(v) => setCfg({ ...cfg, show_in_pipeline: v })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Mensagem padrão</Label>
            <Input value={cfg.message_template} onChange={(e) => setCfg({ ...cfg, message_template: e.target.value })} />
            <p className="text-xs text-muted-foreground">Use <code>{"{nome}"}</code> e <code>{"{acao}"}</code> como variáveis.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gatilhos de celebração</CardTitle>
          <CardDescription>
            As celebrações agora são configuradas <strong>por etapa</strong> em cada pipeline. Ative a opção
            <em> Celebração ao concluir etapa </em> na etapa desejada em <a href="/admin/configuracoes?tab=pipeline" className="text-primary underline">Configurações → Pipeline</a>. Cada oportunidade celebra uma única vez por etapa.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ranking do time</CardTitle>
          <CardDescription>Ranking transparente por período. Sem punir, apenas para inspirar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Exibir ranking no dashboard</p>
              <p className="text-xs text-muted-foreground">Visível para todos da organização.</p>
            </div>
            <Switch checked={cfg.show_leaderboard} onCheckedChange={(v) => setCfg({ ...cfg, show_leaderboard: v })} />
          </div>
          <div className="space-y-2 max-w-xs">
            <Label>Período do ranking</Label>
            <select
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={cfg.leaderboard_period}
              onChange={(e) => setCfg({ ...cfg, leaderboard_period: e.target.value as CelebrationsCfg["leaderboard_period"] })}
            >
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
              <option value="quarterly">Trimestral</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando…</> : <><Save className="w-4 h-4 mr-2" /> Salvar celebrações</>}
        </Button>
      </div>
    </div>
  );
}
