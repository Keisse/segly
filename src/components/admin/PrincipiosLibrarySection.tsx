import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, Plus, Trash2, Pencil, Upload, Save, X, Loader2 } from "lucide-react";
import type { Principle } from "@/hooks/usePrinciple";

type Audience = "all" | "user" | "lider" | "admin";
type Status = "published" | "paused" | "archived";

const AUDIENCE_LABEL: Record<Audience, string> = {
  all: "Todos",
  user: "Usuários",
  lider: "Líderes",
  admin: "Administradores",
};

const STATUS_LABEL: Record<Status, string> = {
  published: "Publicado",
  paused: "Pausado",
  archived: "Arquivado",
};

async function fetchOrgId() {
  const { data } = await supabase.auth.getUser();
  const { data: prof } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", data.user!.id)
    .maybeSingle();
  return prof?.organization_id as string | undefined;
}

export function PrincipiosLibrarySection() {
  const qc = useQueryClient();
  const [newPhrase, setNewPhrase] = useState("");
  const [newAudience, setNewAudience] = useState<Audience>("all");
  const [editing, setEditing] = useState<Principle | null>(null);
  const [orgEnabled, setOrgEnabled] = useState(true);
  const [allowUserToggle, setAllowUserToggle] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: orgId } = useQuery({ queryKey: ["org-id"], queryFn: fetchOrgId });

  const { data: principles = [], isLoading } = useQuery({
    queryKey: ["principles-admin", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("principles" as never)
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Principle[];
    },
  });

  useQuery({
    queryKey: ["org-settings-principle", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("organization_settings" as never)
        .select("settings" as never)
        .eq("organization_id", orgId!)
        .maybeSingle();
      const s = (data as { settings?: Record<string, unknown> } | null)?.settings ?? {};
      const p = (s.principle_of_day as { enabled?: boolean; allow_user_toggle?: boolean }) ?? {};
      setOrgEnabled(p.enabled ?? true);
      setAllowUserToggle(p.allow_user_toggle ?? true);
      return p;
    },
  });

  const saveOrgToggle = useMutation({
    mutationFn: async (patch: { enabled?: boolean; allow_user_toggle?: boolean }) => {
      if (!orgId) return;
      const { data: existing } = await supabase
        .from("organization_settings" as never)
        .select("settings" as never)
        .eq("organization_id", orgId)
        .maybeSingle();
      const current = ((existing as { settings?: Record<string, unknown> } | null)?.settings) ?? {};
      const merged = {
        ...current,
        principle_of_day: {
          enabled: orgEnabled,
          allow_user_toggle: allowUserToggle,
          ...((current.principle_of_day as object) ?? {}),
          ...patch,
        },
      };
      await supabase
        .from("organization_settings" as never)
        .upsert({ organization_id: orgId, settings: merged } as never, { onConflict: "organization_id" });
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!newPhrase.trim() || !orgId) return;
      const { error } = await supabase.from("principles" as never).insert({
        phrase: newPhrase.trim(),
        audience: newAudience,
        status: "published",
        organization_id: orgId,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      setNewPhrase("");
      setNewAudience("all");
      qc.invalidateQueries({ queryKey: ["principles-admin"] });
      toast.success("Princípio adicionado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (p: Principle) => {
      const { error } = await supabase
        .from("principles" as never)
        .update({ phrase: p.phrase, audience: p.audience, status: p.status } as never)
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["principles-admin"] });
      toast.success("Atualizado");
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("principles" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["principles-admin"] });
      toast.success("Excluído");
    },
  });

  const handleUpload = async (file: File) => {
    if (!orgId) return;
    const text = await file.text();
    // Very simple CSV/TSV: first column = phrase, second (optional) = audience
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const rows = lines
      .filter((l, i) => !(i === 0 && /^frase|phrase/i.test(l)))
      .map((l) => {
        const parts = l.split(/[;,\t]/).map((p) => p.replace(/^"|"$/g, "").trim());
        const phrase = parts[0];
        const aud = (parts[1]?.toLowerCase() as Audience) || "all";
        return {
          phrase,
          audience: (["all", "user", "lider", "admin"].includes(aud) ? aud : "all") as Audience,
          status: "published" as Status,
          organization_id: orgId,
        };
      })
      .filter((r) => r.phrase);
    if (rows.length === 0) return toast.error("Nenhuma linha válida encontrada");
    const { error } = await supabase.from("principles" as never).insert(rows as never);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["principles-admin"] });
    toast.success(`${rows.length} princípio(s) importado(s)`);
  };

  const editorialGuidelines = useMemo(
    () => [
      "Incentive responsabilidade, serviço, integridade e cooperação.",
      "Trate autoridade como responsabilidade e serviço — nunca controle ou obediência cega.",
      "Trate cooperação e submissão como maturidade e alinhamento a objetivos legítimos.",
      "Trate prosperidade como valor entregue, trabalho responsável e boa administração.",
      "Não prometa riqueza, cura, proteção ou resultados garantidos.",
      "Evite culpa, medo, manipulação ou pressão religiosa.",
      "Mantenha frases curtas, práticas e adequadas a um ambiente profissional.",
    ],
    []
  );

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>Princípio do Dia</CardTitle>
        </div>
        <CardDescription>
          Gerencie a biblioteca de frases exibidas como um biscoito da sorte para os usuários.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Global toggles */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Ativar na organização</p>
              <p className="text-xs text-muted-foreground">Controle geral da funcionalidade.</p>
            </div>
            <Switch
              checked={orgEnabled}
              onCheckedChange={(v) => {
                setOrgEnabled(v);
                saveOrgToggle.mutate({ enabled: v });
              }}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Permitir usuários ativarem/desativarem</p>
              <p className="text-xs text-muted-foreground">Se desligado, a preferência é definida pela organização.</p>
            </div>
            <Switch
              checked={allowUserToggle}
              onCheckedChange={(v) => {
                setAllowUserToggle(v);
                saveOrgToggle.mutate({ allow_user_toggle: v });
              }}
            />
          </div>
        </div>

        {/* Editorial guidelines */}
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm font-semibold text-amber-500 mb-2">Regras editoriais obrigatórias</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
            {editorialGuidelines.map((g) => <li key={g}>{g}</li>)}
          </ul>
        </div>

        {/* Add new */}
        <div className="rounded-md border border-border p-4 space-y-3">
          <p className="text-sm font-medium">Adicionar novo princípio</p>
          <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
            <div>
              <Label className="text-xs">Frase curta</Label>
              <Input
                value={newPhrase}
                onChange={(e) => setNewPhrase(e.target.value)}
                placeholder="Ex.: Liderar é servir com clareza e propósito."
                maxLength={220}
              />
            </div>
            <div>
              <Label className="text-xs">Público</Label>
              <Select value={newAudience} onValueChange={(v) => setNewAudience(v as Audience)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(AUDIENCE_LABEL) as Audience[]).map((a) => (
                    <SelectItem key={a} value={a}>{AUDIENCE_LABEL[a]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => create.mutate()} disabled={!newPhrase.trim() || create.isPending}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 mr-1" /> Importar CSV
            </Button>
            <span className="text-xs text-muted-foreground">
              1 coluna (frase) ou 2 colunas (frase, público).
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Frase</TableHead>
                <TableHead className="w-40">Público</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-28 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-6">
                  <Loader2 className="w-4 h-4 animate-spin inline" />
                </TableCell></TableRow>
              ) : principles.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">
                  Nenhum princípio cadastrado.
                </TableCell></TableRow>
              ) : principles.map((p) => {
                const isEditing = editing?.id === p.id;
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editing!.phrase}
                          onChange={(e) => setEditing({ ...editing!, phrase: e.target.value })}
                        />
                      ) : (
                        <span className="text-sm italic">"{p.phrase}"</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select
                          value={editing!.audience}
                          onValueChange={(v) => setEditing({ ...editing!, audience: v as Audience })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(AUDIENCE_LABEL) as Audience[]).map((a) => (
                              <SelectItem key={a} value={a}>{AUDIENCE_LABEL[a]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline">{AUDIENCE_LABEL[p.audience]}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select
                          value={editing!.status}
                          onValueChange={(v) => setEditing({ ...editing!, status: v as Status })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={p.status === "published" ? "default" : "secondary"}>
                          {STATUS_LABEL[p.status]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => update.mutate(editing!)}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditing(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setEditing(p)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("Excluir este princípio?")) remove.mutate(p.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
