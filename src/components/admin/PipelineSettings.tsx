import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Save, Loader2, ArrowUp, ArrowDown } from "lucide-react";

type Stage = { id: string; name: string; color: string; wip_limit: number | null };
type PipelineCfg = {
  stages: Stage[];
  default_stage_id: string | null;
  rotting_days: number;
  auto_move_days: number | null;
  require_reason_on_lost: boolean;
};

const DEFAULT_CFG: PipelineCfg = {
  stages: [
    { id: "novo", name: "Novo", color: "#64748b", wip_limit: null },
    { id: "contato", name: "Em contato", color: "#3b82f6", wip_limit: null },
    { id: "proposta", name: "Proposta enviada", color: "#eab308", wip_limit: null },
    { id: "ganho", name: "Ganho", color: "#10b981", wip_limit: null },
    { id: "perdido", name: "Perdido", color: "#ef4444", wip_limit: null },
  ],
  default_stage_id: "novo",
  rotting_days: 14,
  auto_move_days: null,
  require_reason_on_lost: true,
};

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || crypto.randomUUID().slice(0, 6);

export function PipelineSettings() {
  const qc = useQueryClient();
  const [cfg, setCfg] = useState<PipelineCfg>(DEFAULT_CFG);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["org-settings-pipeline"],
    queryFn: async () => {
      const u = await supabase.auth.getUser();
      const { data: prof } = await supabase.from("profiles").select("organization_id").eq("id", u.data.user!.id).maybeSingle();
      const oid = (prof as { organization_id: string | null } | null)?.organization_id ?? null;
      setOrgId(oid);
      if (!oid) return null;
      const { data: row } = await supabase.from("organization_settings" as never).select("settings" as never).eq("organization_id", oid).maybeSingle();
      const s = (row as { settings?: Record<string, unknown> } | null)?.settings ?? {};
      return (s.pipeline as PipelineCfg) ?? DEFAULT_CFG;
    },
  });

  useEffect(() => { if (data) setCfg({ ...DEFAULT_CFG, ...data, stages: data.stages?.length ? data.stages : DEFAULT_CFG.stages }); }, [data]);

  const save = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase.from("organization_settings" as never).select("settings" as never).eq("organization_id", orgId).maybeSingle();
      const current = ((existing as { settings?: Record<string, unknown> } | null)?.settings) ?? {};
      const merged = { ...current, pipeline: cfg };
      const { error } = await supabase.from("organization_settings" as never).upsert({ organization_id: orgId, settings: merged } as never, { onConflict: "organization_id" });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["org-settings-pipeline"] });
      toast.success("Pipeline salva.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally { setSaving(false); }
  };

  const addStage = () => setCfg({ ...cfg, stages: [...cfg.stages, { id: crypto.randomUUID().slice(0, 8), name: "Nova etapa", color: "#8b5cf6", wip_limit: null }] });
  const updateStage = (i: number, patch: Partial<Stage>) => setCfg({ ...cfg, stages: cfg.stages.map((s, idx) => idx === i ? { ...s, ...patch, id: patch.name ? slug(patch.name) : s.id } : s) });
  const removeStage = (i: number) => setCfg({ ...cfg, stages: cfg.stages.filter((_, idx) => idx !== i) });
  const move = (i: number, dir: -1 | 1) => {
    const next = [...cfg.stages];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setCfg({ ...cfg, stages: next });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Etapas da pipeline</CardTitle>
          <CardDescription>Defina os estágios pelos quais os leads passam. A ordem aqui é a mesma no quadro.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {cfg.stages.map((s, i) => (
            <div key={s.id + i} className="flex items-center gap-2 rounded-md border border-border p-2">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <input type="color" value={s.color} onChange={(e) => updateStage(i, { color: e.target.value })} className="h-8 w-10 rounded border border-border bg-transparent" />
              <Input className="flex-1" value={s.name} onChange={(e) => updateStage(i, { name: e.target.value })} />
              <Input
                type="number"
                min={0}
                placeholder="Limite WIP"
                className="w-28"
                value={s.wip_limit ?? ""}
                onChange={(e) => updateStage(i, { wip_limit: e.target.value ? Number(e.target.value) : null })}
              />
              <Button size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => move(i, 1)} disabled={i === cfg.stages.length - 1}><ArrowDown className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => removeStage(i)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button variant="outline" onClick={addStage}><Plus className="w-4 h-4 mr-1" /> Adicionar etapa</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regras da pipeline</CardTitle>
          <CardDescription>Comportamentos padrão aplicados a todas as oportunidades.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Etapa inicial padrão</Label>
              <select
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
                value={cfg.default_stage_id ?? ""}
                onChange={(e) => setCfg({ ...cfg, default_stage_id: e.target.value })}
              >
                {cfg.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Considerar lead "parado" após (dias)</Label>
              <Input type="number" min={1} value={cfg.rotting_days} onChange={(e) => setCfg({ ...cfg, rotting_days: Number(e.target.value) || 1 })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Mover automaticamente para próxima etapa após (dias sem interação)</Label>
              <Input
                type="number"
                min={0}
                placeholder="Desligado"
                value={cfg.auto_move_days ?? ""}
                onChange={(e) => setCfg({ ...cfg, auto_move_days: e.target.value ? Number(e.target.value) : null })}
              />
              <p className="text-xs text-muted-foreground">Deixe em branco para desligar a automação.</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Exigir motivo ao mover para "Perdido"</p>
              <p className="text-xs text-muted-foreground">Garante que o time registre o aprendizado.</p>
            </div>
            <Switch checked={cfg.require_reason_on_lost} onCheckedChange={(v) => setCfg({ ...cfg, require_reason_on_lost: v })} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando…</> : <><Save className="w-4 h-4 mr-2" /> Salvar pipeline</>}
        </Button>
      </div>
    </div>
  );
}
