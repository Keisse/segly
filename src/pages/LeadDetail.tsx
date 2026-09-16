import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Mail, Phone, Building2, Briefcase, Users, Calendar, MessageSquare, Plus, Loader2, Pencil, Check, X, History, ChevronDown } from "lucide-react";
import { useLead, useAddNote, useUpdateNote, useUpdateLeadStatus } from "@/hooks/useLeads";
import { useAuth } from "@/hooks/useAuth";
import { useMyRole } from "@/hooks/useMyRole";
import { LeadActivitiesPanel } from "@/components/admin/LeadActivitiesPanel";
import { LeadAuditTimeline } from "@/components/admin/LeadAuditTimeline";
import { LeadEditDialog } from "@/components/admin/LeadEditDialog";
import { LeadProposalsPanel } from "@/components/admin/LeadProposalsPanel";
import { LeadStageInformation } from "@/components/admin/LeadStageInformation";
import { statusLabels, statusColors, getMaturityLevel, maturityLabels, maturityColors, type LeadStatus } from "@/types/lead";
import { capitalizeWords } from "@/lib/formatName";
import { formatPhone } from "@/lib/phone";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";

type InfoField = {
  key: string;
  label: string;
  source: "direct" | "custom";
  sourceKey: string;
  long?: boolean;
  format?: "phone" | "document";
};

const infoFields: InfoField[] = [
  { key: "empresa", label: "Nome da Empresa ou Pessoa Física", source: "direct", sourceKey: "empresa" },
  { key: "cnpj", label: "CNPJ ou CPF", source: "direct", sourceKey: "cnpj", format: "document" },
  { key: "nome", label: "Nome do responsável", source: "direct", sourceKey: "nome" },
  { key: "telefone", label: "Telefone do responsável", source: "direct", sourceKey: "telefone", format: "phone" },
  { key: "responsavel_proprietario", label: "O responsável é o proprietário?", source: "custom", sourceKey: "responsavel_proprietario" },
  { key: "email", label: "E-mail", source: "direct", sourceKey: "email" },
  { key: "plano_saude_operadora", label: "Tem plano de Saúde? Qual operadora?", source: "custom", sourceKey: "plano_saude_operadora" },
  { key: "acomodacao", label: "Acomodação", source: "custom", sourceKey: "acomodacao" },
  { key: "coparticipacao", label: "Tem coparticipação?", source: "custom", sourceKey: "coparticipacao" },
  { key: "plano_odontologico", label: "Tem plano odontológico?", source: "custom", sourceKey: "plano_odontologico" },
  { key: "tipo_plano", label: "Plano familiar ou empresarial?", source: "custom", sourceKey: "tipo_plano" },
  { key: "quantidade_pessoas", label: "Quantas pessoas?", source: "custom", sourceKey: "quantidade_pessoas" },
  { key: "datas_nascimento", label: "Data de nascimento de todos", source: "custom", sourceKey: "datas_nascimento", long: true },
  { key: "comentarios", label: "Comentários", source: "custom", sourceKey: "comentarios", long: true },
];

const normalize = (value: string) => value.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const formatCpfCnpj = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    return digits.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  return digits.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
};

const LeadDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: role } = useMyRole();
  const { data: lead, isLoading } = useLead(id || "");
  const { data: currentProfile } = useQuery({
    queryKey: ["current-profile-name", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return data as { display_name: string | null } | null;
    },
    enabled: !!user?.id,
  });
  const { data: pipelineStages = [] } = useQuery({
    queryKey: ["lead-detail-pipeline-stages", lead?.pipeline_id],
    queryFn: async () => {
      if (!lead?.pipeline_id) return [];
      const { data, error } = await supabase.from("pipeline_stages" as never).select("id,nome,ordem").eq("pipeline_id", lead.pipeline_id).order("ordem");
      if (error) throw error;
      return (data ?? []) as unknown as { id: string; nome: string; ordem: number }[];
    },
    enabled: !!lead?.pipeline_id,
  });

  const addNote = useAddNote();
  const updateNote = useUpdateNote();
  const updateStatus = useUpdateLeadStatus();
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editingInfoKey, setEditingInfoKey] = useState<string | null>(null);
  const [editingInfoValue, setEditingInfoValue] = useState("");
  const [savingInfoKey, setSavingInfoKey] = useState<string | null>(null);
  const canViewAudit = role === "admin" || role === "lider";
  const displayName = currentProfile?.display_name?.trim() || user?.email?.split("@")[0] || "time";
  const firstName = capitalizeWords(displayName.split(/\s+/)[0]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!lead) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><p className="text-muted-foreground mb-4">Lead não encontrado</p><Button onClick={() => navigate("/admin/dashboard")}>Voltar ao Dashboard</Button></div></div>;

  const currentStage = pipelineStages.find((stage) => stage.id === lead.stage_id) ?? null;
  const negotiationStage = pipelineStages.find((stage) => normalize(stage.nome).includes("negoci")) ?? null;
  const canShowProposals = !!currentStage && !!negotiationStage && currentStage.ordem >= negotiationStage.ordem;

  const hasDiagnostic = !!lead.resultado_diagnostico && (lead.resultado_diagnostico.pillarScores?.length ?? 0) > 0;
  const score = lead.resultado_diagnostico?.percentage ?? 0;
  const maturityLevel = getMaturityLevel(score);
  const pillarScores = lead.resultado_diagnostico?.pillarScores || [];
  const radarData = pillarScores.map((p) => ({ subject: p.pillarName, value: p.percentage }));

  const getInfoValue = (field: InfoField) => {
    if (field.source === "custom") return String(lead.custom_fields?.[field.sourceKey] ?? "");
    return String((lead as unknown as Record<string, unknown>)[field.sourceKey] ?? "");
  };

  const startInfoEdit = (field: InfoField) => {
    setEditingInfoKey(field.key);
    setEditingInfoValue(getInfoValue(field));
  };

  const cancelInfoEdit = () => {
    setEditingInfoKey(null);
    setEditingInfoValue("");
  };

  const saveInfoField = async (field: InfoField) => {
    setSavingInfoKey(field.key);
    try {
      let value = editingInfoValue.trim();
      if (field.format === "phone") value = formatPhone(value);
      if (field.format === "document") value = formatCpfCnpj(value);

      if (field.source === "direct") {
        const { error } = await supabase.from("leads").update({ [field.sourceKey]: value || null } as never).eq("id", lead.id);
        if (error) throw error;
      } else {
        const { data: currentLead, error: fetchError } = await supabase.from("leads").select("custom_fields").eq("id", lead.id).single();
        if (fetchError) throw fetchError;
        const currentCustom = currentLead?.custom_fields && typeof currentLead.custom_fields === "object" ? currentLead.custom_fields as Record<string, unknown> : {};
        const nextCustom = { ...currentCustom, [field.sourceKey]: value || null };
        const { error } = await supabase.from("leads").update({ custom_fields: nextCustom } as never).eq("id", lead.id);
        if (error) throw error;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lead", lead.id] }),
        queryClient.invalidateQueries({ queryKey: ["leads"] }),
        queryClient.invalidateQueries({ queryKey: ["leads-by-pipeline"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-v2-leads"] }),
        queryClient.invalidateQueries({ queryKey: ["lead-audit-timeline", lead.id] }),
        queryClient.invalidateQueries({ queryKey: ["audit-events"] }),
      ]);
      toast.success(`${field.label} atualizado.`);
      cancelInfoEdit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a informação.");
    } finally {
      setSavingInfoKey(null);
    }
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNote.mutate({ id: lead.id, nota: { data: new Date().toISOString(), autor: user?.email || "Admin", texto: newNote.trim() } });
    setNewNote("");
  };

  const saveEditNote = (noteId: string) => {
    if (!editingNoteText.trim()) return;
    updateNote.mutate({ id: lead.id, noteId, texto: editingNoteText }, { onSuccess: () => { setEditingNoteId(null); setEditingNoteText(""); } });
  };

  return (
    <div className="min-h-screen py-4 px-3 sm:py-6 sm:px-4">
      <div className="max-w-5xl mx-auto space-y-6 min-w-0">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/dashboard")}><ArrowLeft className="w-5 h-5" /></Button>
          <p className="text-lg font-semibold text-foreground">Bom trabalho, {firstName}.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 sm:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2"><h1 className="text-2xl font-display font-bold text-foreground break-words">{capitalizeWords(lead.nome)}</h1><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setEditOpen(true)} title="Editar lead"><Pencil className="h-4 w-4" /></Button></div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{lead.empresa}</span>
                <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" />{lead.cargo}</span>
                <span className="flex items-center gap-1"><Users className="w-4 h-4" />{lead.departamento}</span>
                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {hasDiagnostic && <div className="text-center"><div className={`text-3xl font-bold ${maturityLevel === "iniciante" ? "text-red-400" : maturityLevel === "intermediario" ? "text-amber-400" : maturityLevel === "avancado" ? "text-blue-400" : "text-emerald-400"}`}>{Math.round(score)}%</div><div className={`px-3 py-1 rounded-full text-xs font-medium ${maturityColors[maturityLevel]}`}>{maturityLabels[maturityLevel]}</div></div>}
              <Select value={lead.status} onValueChange={(newStatus) => updateStatus.mutate({ id: lead.id, status: newStatus as LeadStatus })}><SelectTrigger className={`w-[150px] ${statusColors[lead.status]} border-0`}><SelectValue /></SelectTrigger><SelectContent className="bg-card border-border">{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-border/50">
            <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline break-all"><Mail className="w-4 h-4 shrink-0" />{lead.email}</a>
            <a href={`tel:${lead.telefone}`} className="flex items-center gap-2 text-sm text-primary hover:underline"><Phone className="w-4 h-4" />{lead.telefone}</a>
            <a href={`https://wa.me/${lead.telefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-emerald-400 hover:underline"><MessageSquare className="w-4 h-4" />WhatsApp</a>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground">Informações iniciais</h2>
            <p className="text-sm text-muted-foreground">Dados do cadastro inicial do lead. Use o lápis para completar, corrigir ou deixar uma informação vazia.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {infoFields.map((field) => {
              const value = getInfoValue(field);
              const editing = editingInfoKey === field.key;
              const saving = savingInfoKey === field.key;
              return (
                <div key={field.key} className={`bg-secondary/30 rounded-lg p-4 ${field.long ? "md:col-span-2" : ""}`}>
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <p className="text-xs text-muted-foreground">{field.label}</p>
                    {!editing && <Button variant="ghost" size="icon" className="h-7 w-7 -mt-1 -mr-1 shrink-0" onClick={() => startInfoEdit(field)} title={`Editar ${field.label}`} aria-label={`Editar ${field.label}`}><Pencil className="h-3.5 w-3.5" /></Button>}
                  </div>
                  {editing ? (
                    <div className="space-y-2">
                      {field.long ? <Textarea value={editingInfoValue} onChange={(e) => setEditingInfoValue(e.target.value)} rows={3} autoFocus disabled={saving} /> : <Input value={editingInfoValue} onChange={(e) => { let next = e.target.value; if (field.format === "phone") next = formatPhone(next); if (field.format === "document") next = formatCpfCnpj(next); setEditingInfoValue(next); }} onKeyDown={(e) => { if (e.key === "Enter") saveInfoField(field); if (e.key === "Escape") cancelInfoEdit(); }} autoFocus disabled={saving} />}
                      <div className="flex justify-end gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelInfoEdit} disabled={saving} title="Cancelar"><X className="h-4 w-4" /></Button><Button size="icon" className="h-8 w-8" onClick={() => saveInfoField(field)} disabled={saving} title="Salvar">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}</Button></div>
                    </div>
                  ) : <p className={value ? "text-sm text-foreground font-medium whitespace-pre-wrap break-words" : "text-sm text-muted-foreground italic"}>{value || "Não informado"}</p>}
                </div>
              );
            })}
          </div>
        </motion.div>

        <LeadStageInformation leadId={lead.id} />

        {canViewAudit && (
          <details className="glass-card group overflow-hidden">
            <summary className="cursor-pointer list-none p-5 flex items-center justify-between gap-3 select-none">
              <div className="flex items-center gap-2"><History className="h-5 w-5 text-primary" /><div><p className="font-semibold">Histórico de alterações</p><p className="text-sm text-muted-foreground">Clique para consultar as alterações deste lead.</p></div></div>
              <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-5 pb-5"><LeadAuditTimeline leadId={lead.id} /></div>
          </details>
        )}

        {canShowProposals && <LeadProposalsPanel leadId={lead.id} ownerId={lead.owner_id ?? null} currentProductId={lead.product_id ?? null} customFields={lead.custom_fields} />}

        <LeadActivitiesPanel leadId={lead.id} ownerId={lead.owner_id ?? null} />

        {hasDiagnostic && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6"><h2 className="text-lg font-semibold text-foreground mb-4">Perfil por Pilar</h2>{radarData.length > 0 ? <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radarData}><PolarGrid stroke="hsl(var(--border))" /><PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} /><PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} /><Radar name="Score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} /></RadarChart></ResponsiveContainer></div> : <p className="text-muted-foreground text-center py-8">Dados do diagnóstico não disponíveis</p>}</motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6"><h2 className="text-lg font-semibold text-foreground mb-4">Detalhamento por Pilar</h2><div className="space-y-3">{pillarScores.map((pillar) => { const pm = getMaturityLevel(pillar.percentage); return <div key={pillar.pillarId} className="space-y-1"><div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><span>{pillar.icon}</span><span className="text-foreground">{pillar.pillarName}</span></span><span className={`px-2 py-0.5 rounded-full text-xs ${maturityColors[pm]}`}>{Math.round(pillar.percentage)}%</span></div><div className="h-2 bg-secondary rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${pm === "iniciante" ? "bg-red-500" : pm === "intermediario" ? "bg-amber-500" : pm === "avancado" ? "bg-blue-500" : "bg-emerald-500"}`} style={{ width: `${pillar.percentage}%` }} /></div></div>; })}</div></motion.div>
        </div>}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Notas</h2>
          <div className="flex flex-col sm:flex-row gap-2 mb-4"><Textarea placeholder="Adicionar uma nota..." value={newNote} onChange={(e) => setNewNote(e.target.value)} className="bg-card border-border/50 resize-none" rows={2} /><Button onClick={handleAddNote} disabled={!newNote.trim() || addNote.isPending} className="shrink-0">{addNote.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}</Button></div>
          <div className="space-y-3">{lead.notas.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Nenhuma nota ainda</p> : [...lead.notas].reverse().map((nota) => { const isEditing = editingNoteId === nota.id; return <div key={nota.id} className="bg-secondary/30 rounded-lg p-3 space-y-2"><div className="flex items-center justify-between gap-3 text-xs text-muted-foreground"><div className="flex flex-wrap items-center gap-2"><span>{nota.autor}</span><span>•</span><span>{format(new Date(nota.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span></div>{!isEditing && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingNoteId(nota.id); setEditingNoteText(nota.texto); }} aria-label="Editar nota"><Pencil className="h-3.5 w-3.5" /></Button>}</div>{isEditing ? <div className="space-y-2"><Textarea value={editingNoteText} onChange={(e) => setEditingNoteText(e.target.value)} rows={3} autoFocus /><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => { setEditingNoteId(null); setEditingNoteText(""); }} disabled={updateNote.isPending}><X className="h-3.5 w-3.5 mr-1" />Cancelar</Button><Button size="sm" onClick={() => saveEditNote(nota.id)} disabled={!editingNoteText.trim() || updateNote.isPending}>{updateNote.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}Salvar</Button></div></div> : <p className="text-sm text-foreground whitespace-pre-wrap break-words">{nota.texto}</p>}</div>; })}</div>
        </motion.div>
      </div>
      <LeadEditDialog lead={lead} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
};

export default LeadDetail;
