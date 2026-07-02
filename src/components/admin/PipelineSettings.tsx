import { useEffect, useMemo, useState } from "react";
import { usePipelines, usePipelineStages, useCreatePipeline, useUpdatePipeline, useDeletePipeline, useUpsertStage, useDeleteStage, type PipelineStage, type CelebrateAudience } from "@/hooks/usePipelines";
import { useMyRole } from "@/hooks/useMyRole";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, ArrowUp, ArrowDown, MoreVertical, Archive, ArchiveRestore, Copy, Pencil, Save, Loader2, PartyPopper, ChevronDown, Lock } from "lucide-react";

type StageDraft = PipelineStage & { _new?: boolean; _dirty?: boolean };

export function PipelineSettings() {
  const { data: pipelines = [], isLoading } = usePipelines({ includeArchived: true });
  const activePipelines = useMemo(() => pipelines.filter((p) => !p.arquivado), [pipelines]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && activePipelines.length > 0) setSelectedId(activePipelines[0].id);
    if (selectedId && !pipelines.find((p) => p.id === selectedId) && activePipelines.length > 0) setSelectedId(activePipelines[0].id);
  }, [activePipelines, pipelines, selectedId]);

  const selected = pipelines.find((p) => p.id === selectedId) ?? null;
  const { data: stages = [] } = usePipelineStages(selectedId);
  const upsertStage = useUpsertStage();
  const deleteStage = useDeleteStage();
  const updatePipeline = useUpdatePipeline();
  const deletePipeline = useDeletePipeline();

  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // Local draft buffer — only persists on Save
  const [draft, setDraft] = useState<StageDraft[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(stages.map((s) => ({ ...s }))); setRemoved([]); }, [stages]);

  const dirty = useMemo(() => {
    if (removed.length > 0) return true;
    if (draft.length !== stages.length) return true;
    return draft.some((d, i) => d._dirty || d._new || d.id !== stages[i]?.id || d.ordem !== i);
  }, [draft, stages, removed]);

  const patch = (id: string, p: Partial<StageDraft>) =>
    setDraft((d) => d.map((s) => (s.id === id ? { ...s, ...p, _dirty: true } : s)));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= draft.length) return;
    const next = [...draft];
    [next[i], next[j]] = [next[j], next[i]];
    setDraft(next.map((s, idx) => ({ ...s, ordem: idx, _dirty: s.ordem !== idx || s._dirty })));
  };

  const addStage = () => {
    if (!selectedId) return;
    setDraft((d) => [
      ...d,
      {
        id: `new-${crypto.randomUUID()}`,
        pipeline_id: selectedId,
        nome: "Nova etapa",
        cor: "#8b5cf6",
        ordem: d.length,
        wip_limit: null,
        is_won: false,
        is_lost: false,
        celebrate_enabled: false,
        celebrate_type: "confetti",
        celebrate_audience: "owner" as CelebrateAudience,
        _new: true,
        _dirty: true,
      },
    ]);
  };

  const remove = (id: string) => {
    setDraft((d) => d.filter((s) => s.id !== id).map((s, i) => ({ ...s, ordem: i, _dirty: true })));
    if (!id.startsWith("new-")) setRemoved((r) => [...r, id]);
  };

  const save = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      for (const id of removed) {
        await deleteStage.mutateAsync({ id, pipelineId: selectedId });
      }
      for (let i = 0; i < draft.length; i++) {
        const s = draft[i];
        if (s._new) {
          await upsertStage.mutateAsync({
            pipeline_id: selectedId,
            nome: s.nome,
            cor: s.cor,
            ordem: i,
            wip_limit: s.wip_limit,
            is_won: s.is_won,
            is_lost: s.is_lost,
          });
        } else if (s._dirty || s.ordem !== i) {
          await upsertStage.mutateAsync({
            id: s.id,
            pipeline_id: selectedId,
            nome: s.nome,
            cor: s.cor,
            ordem: i,
            wip_limit: s.wip_limit,
            is_won: s.is_won,
            is_lost: s.is_lost,
          });
        }
      }
      setRemoved([]);
      toast.success("Pipeline salvo.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando pipelines…</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pipelines da organização</CardTitle>
          <CardDescription>Cada pipeline aparece como uma aba na página Pipelines. Selecione um para configurar suas etapas.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <div className="min-w-[240px]">
            <Select value={selectedId ?? ""} onValueChange={setSelectedId}>
              <SelectTrigger><SelectValue placeholder="Selecione um pipeline" /></SelectTrigger>
              <SelectContent>
                {pipelines.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: p.cor ?? "#1D9E75" }} />
                      {p.nome}{p.arquivado ? " (arquivado)" : ""}{p.is_default ? " • padrão" : ""}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Novo pipeline</Button></DialogTrigger>
            <CreatePipelineDialog onCreated={(id) => { setSelectedId(id); setCreateOpen(false); }} />
          </Dialog>

          {selected && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setRenameValue(selected.nome); setRenameOpen(true); }}>
                  <Pencil className="w-4 h-4 mr-2" /> Renomear
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  const u = await supabase.auth.getUser();
                  const { data: prof } = await supabase.from("profiles").select("organization_id").eq("id", u.data.user!.id).maybeSingle();
                  const orgId = (prof as { organization_id: string } | null)?.organization_id;
                  if (!orgId) return;
                  const { data: p } = await supabase.from("pipelines" as never).insert({ organization_id: orgId, nome: `${selected.nome} (cópia)`, cor: selected.cor, ordem: pipelines.length } as never).select().single();
                  const newId = (p as { id: string } | null)?.id;
                  if (newId && stages.length) {
                    await supabase.from("pipeline_stages" as never).insert(stages.map((s) => ({ pipeline_id: newId, nome: s.nome, cor: s.cor, ordem: s.ordem, wip_limit: s.wip_limit, is_won: s.is_won, is_lost: s.is_lost })) as never);
                  }
                  toast.success("Pipeline duplicado.");
                  setSelectedId(newId ?? selectedId);
                }}>
                  <Copy className="w-4 h-4 mr-2" /> Duplicar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updatePipeline.mutate({ id: selected.id, patch: { arquivado: !selected.arquivado } })}>
                  {selected.arquivado ? <><ArchiveRestore className="w-4 h-4 mr-2" /> Desarquivar</> : <><Archive className="w-4 h-4 mr-2" /> Arquivar</>}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  disabled={activePipelines.length <= 1}
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle>Etapas de "{selected.nome}"</CardTitle>
            <CardDescription>Ordene, edite cor, limite WIP e marque etapas como Ganho/Perdido. Clique em Salvar para aplicar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {draft.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 rounded-md border border-border p-2">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
                <input
                  type="color"
                  value={s.cor ?? "#64748b"}
                  onChange={(e) => patch(s.id, { cor: e.target.value })}
                  className="h-8 w-10 rounded border border-border bg-transparent"
                />
                <Input className="flex-1" value={s.nome} onChange={(e) => patch(s.id, { nome: e.target.value })} />
                <Input
                  type="number"
                  min={0}
                  placeholder="WIP"
                  className="w-20"
                  value={s.wip_limit ?? ""}
                  onChange={(e) => patch(s.id, { wip_limit: e.target.value ? Number(e.target.value) : null })}
                />
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={s.is_won} onChange={(e) => patch(s.id, { is_won: e.target.checked, is_lost: e.target.checked ? false : s.is_lost })} />
                  Ganho
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={s.is_lost} onChange={(e) => patch(s.id, { is_lost: e.target.checked, is_won: e.target.checked ? false : s.is_won })} />
                  Perdido
                </label>
                <Button size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => move(i, 1)} disabled={i === draft.length - 1}><ArrowDown className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove(s.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
            <Button variant="outline" onClick={addStage}><Plus className="w-4 h-4 mr-1" /> Adicionar etapa</Button>
          </CardContent>
        </Card>
      )}

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle>Definir como padrão</CardTitle>
            <CardDescription>Novos leads sem pipeline definido irão para o pipeline padrão da organização.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-sm">Este é o pipeline padrão?</p>
            <Switch
              checked={selected.is_default}
              onCheckedChange={async (v) => {
                if (v) {
                  await supabase.from("pipelines" as never).update({ is_default: false } as never).eq("organization_id", selected.organization_id);
                }
                updatePipeline.mutate({ id: selected.id, patch: { is_default: v } });
              }}
            />
          </CardContent>
        </Card>
      )}

      {selected && (
        <div className="flex justify-end sticky bottom-4">
          <Button onClick={save} disabled={saving || !dirty} className="shadow-lg">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando…</> : <><Save className="w-4 h-4 mr-2" /> Salvar alterações</>}
          </Button>
        </div>
      )}

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Renomear pipeline</DialogTitle></DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancelar</Button>
            <Button onClick={() => { if (selected && renameValue.trim()) { updatePipeline.mutate({ id: selected.id, patch: { nome: renameValue.trim() } }); setRenameOpen(false); } }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeletePipelineDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        pipeline={selected}
        options={activePipelines.filter((p) => p.id !== selected?.id)}
        onDone={() => { setDeleteOpen(false); setSelectedId(null); }}
        deletePipeline={deletePipeline.mutateAsync}
      />
    </div>
  );
}

function CreatePipelineDialog({ onCreated }: { onCreated: (id: string) => void }) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [cor, setCor] = useState("#1D9E75");
  const [withDefaults, setWithDefaults] = useState(true);
  const create = useCreatePipeline();

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo pipeline</DialogTitle>
        <DialogDescription>Este pipeline aparecerá como uma aba na página Pipelines.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1"><Label>Nome *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Renovação" /></div>
        <div className="space-y-1"><Label>Descrição</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} /></div>
        <div className="space-y-1"><Label>Cor</Label><input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="h-10 w-16 rounded border border-border bg-transparent" /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={withDefaults} onChange={(e) => setWithDefaults(e.target.checked)} /> Criar com etapas padrão (Novo → Ganho/Perdido)</label>
      </div>
      <DialogFooter>
        <Button disabled={!nome.trim() || create.isPending} onClick={async () => {
          const p = await create.mutateAsync({ nome: nome.trim(), descricao: descricao.trim() || undefined, cor, withDefaultStages: withDefaults });
          onCreated(p.id);
        }}>Criar pipeline</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function DeletePipelineDialog({ open, onOpenChange, pipeline, options, onDone, deletePipeline }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pipeline: { id: string; nome: string } | null;
  options: { id: string; nome: string }[];
  onDone: () => void;
  deletePipeline: (args: { id: string; moveLeadsTo?: string | null }) => Promise<void>;
}) {
  const [moveTo, setMoveTo] = useState<string>("");
  useEffect(() => { if (open && options[0]) setMoveTo(options[0].id); }, [open, options]);

  if (!pipeline) return null;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir pipeline "{pipeline.nome}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Leads vinculados serão movidos para o pipeline selecionado abaixo. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label>Mover leads para</Label>
          <Select value={moveTo} onValueChange={setMoveTo}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {options.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async () => { await deletePipeline({ id: pipeline.id, moveLeadsTo: moveTo || null }); onDone(); }}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
