import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Mail, Phone, Building2, Briefcase, Users, Calendar, MessageSquare, Plus, Loader2, Pencil, Check, X } from "lucide-react";
import { useLead, useAddNote, useUpdateNote, useUpdateLeadStatus } from "@/hooks/useLeads";
import { useAuth } from "@/hooks/useAuth";
import { useMyRole } from "@/hooks/useMyRole";
import { LeadActivitiesPanel } from "@/components/admin/LeadActivitiesPanel";
import { LeadAuditTimeline } from "@/components/admin/LeadAuditTimeline";
import { LeadEditDialog } from "@/components/admin/LeadEditDialog";
import { statusLabels, statusColors, getMaturityLevel, maturityLabels, maturityColors, type LeadStatus } from "@/types/lead";
import { capitalizeWords } from "@/lib/formatName";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";

const seglyLogo = "/segly-logo.png";
const customLabels: Record<string, string> = {
  cnpj: "CNPJ",
  responsavel_proprietario: "Responsável é proprietário?",
  plano_saude_operadora: "Plano de Saúde / Operadora",
  acomodacao: "Acomodação",
  coparticipacao: "Coparticipação",
  plano_odontologico: "Plano odontológico",
  tipo_plano: "Tipo do plano",
  quantidade_pessoas: "Quantidade de pessoas",
  datas_nascimento: "Datas de nascimento",
  comentarios: "Comentários",
};

const LeadDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: role } = useMyRole();
  const { data: lead, isLoading } = useLead(id || "");
  const addNote = useAddNote();
  const updateNote = useUpdateNote();
  const updateStatus = useUpdateLeadStatus();
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const canViewAudit = role === "admin" || role === "lider";

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!lead) return <div className="min-h-screen flex items-center justify-center"><div className="text-center"><p className="text-muted-foreground mb-4">Lead não encontrado</p><Button onClick={() => navigate("/admin/dashboard")}>Voltar ao Dashboard</Button></div></div>;

  const hasDiagnostic = !!lead.resultado_diagnostico && (lead.resultado_diagnostico.pillarScores?.length ?? 0) > 0;
  const score = lead.resultado_diagnostico?.percentage ?? 0;
  const maturityLevel = getMaturityLevel(score);
  const pillarScores = lead.resultado_diagnostico?.pillarScores || [];
  const radarData = pillarScores.map((p) => ({ subject: p.pillarName, value: p.percentage }));
  const customEntries = Object.entries(lead.custom_fields || {}).filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "");

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
    <div className="min-h-screen py-6 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/dashboard")}><ArrowLeft className="w-5 h-5" /></Button>
          <img src={seglyLogo} alt="Segly" className="h-8" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2"><h1 className="text-2xl font-display font-bold text-foreground">{capitalizeWords(lead.nome)}</h1><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditOpen(true)} title="Editar lead"><Pencil className="h-4 w-4" /></Button></div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{lead.empresa}</span>
                <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" />{lead.cargo}</span>
                <span className="flex items-center gap-1"><Users className="w-4 h-4" />{lead.departamento}</span>
                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {hasDiagnostic && <div className="text-center"><div className={`text-3xl font-bold ${maturityLevel === "iniciante" ? "text-red-400" : maturityLevel === "intermediario" ? "text-amber-400" : maturityLevel === "avancado" ? "text-blue-400" : "text-emerald-400"}`}>{Math.round(score)}%</div><div className={`px-3 py-1 rounded-full text-xs font-medium ${maturityColors[maturityLevel]}`}>{maturityLabels[maturityLevel]}</div></div>}
              <Select value={lead.status} onValueChange={(newStatus) => updateStatus.mutate({ id: lead.id, status: newStatus as LeadStatus })}><SelectTrigger className={`w-[150px] ${statusColors[lead.status]} border-0`}><SelectValue /></SelectTrigger><SelectContent className="bg-card border-border">{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-border/50">
            <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline"><Mail className="w-4 h-4" />{lead.email}</a>
            <a href={`tel:${lead.telefone}`} className="flex items-center gap-2 text-sm text-primary hover:underline"><Phone className="w-4 h-4" />{lead.telefone}</a>
            <a href={`https://wa.me/${lead.telefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-emerald-400 hover:underline"><MessageSquare className="w-4 h-4" />WhatsApp</a>
          </div>
        </motion.div>

        {customEntries.length > 0 && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <div className="flex items-center justify-between gap-3 mb-4"><div><h2 className="text-lg font-semibold text-foreground">Dados do cadastro</h2><p className="text-sm text-muted-foreground">Respostas persistidas do formulário e das etapas deste lead.</p></div><Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil className="h-3.5 w-3.5 mr-1.5" />Editar</Button></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{customEntries.map(([key, value]) => <div key={key} className={key === "comentarios" || key === "datas_nascimento" ? "bg-secondary/30 rounded-lg p-4 md:col-span-2" : "bg-secondary/30 rounded-lg p-4"}><p className="text-xs text-muted-foreground mb-1">{customLabels[key] || key.replace(/_/g, " ")}</p><p className="text-sm text-foreground whitespace-pre-wrap">{String(value)}</p></div>)}</div>
        </motion.div>}

        <LeadActivitiesPanel leadId={lead.id} ownerId={lead.owner_id ?? null} />
        {canViewAudit && <LeadAuditTimeline leadId={lead.id} />}

        {hasDiagnostic && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6"><h2 className="text-lg font-semibold text-foreground mb-4">Perfil por Pilar</h2>{radarData.length > 0 ? <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><RadarChart data={radarData}><PolarGrid stroke="hsl(var(--border))" /><PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} /><PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} /><Radar name="Score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} /></RadarChart></ResponsiveContainer></div> : <p className="text-muted-foreground text-center py-8">Dados do diagnóstico não disponíveis</p>}</motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6"><h2 className="text-lg font-semibold text-foreground mb-4">Detalhamento por Pilar</h2><div className="space-y-3">{pillarScores.map((pillar) => { const pm = getMaturityLevel(pillar.percentage); return <div key={pillar.pillarId} className="space-y-1"><div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><span>{pillar.icon}</span><span className="text-foreground">{pillar.pillarName}</span></span><span className={`px-2 py-0.5 rounded-full text-xs ${maturityColors[pm]}`}>{Math.round(pillar.percentage)}%</span></div><div className="h-2 bg-secondary rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${pm === "iniciante" ? "bg-red-500" : pm === "intermediario" ? "bg-amber-500" : pm === "avancado" ? "bg-blue-500" : "bg-emerald-500"}`} style={{ width: `${pillar.percentage}%` }} /></div></div>; })}</div></motion.div>
        </div>}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Notas</h2>
          <div className="flex gap-2 mb-4"><Textarea placeholder="Adicionar uma nota..." value={newNote} onChange={(e) => setNewNote(e.target.value)} className="bg-card border-border/50 resize-none" rows={2} /><Button onClick={handleAddNote} disabled={!newNote.trim() || addNote.isPending} className="shrink-0">{addNote.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}</Button></div>
          <div className="space-y-3">{lead.notas.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Nenhuma nota ainda</p> : [...lead.notas].reverse().map((nota) => { const isEditing = editingNoteId === nota.id; return <div key={nota.id} className="bg-secondary/30 rounded-lg p-3 space-y-2"><div className="flex items-center justify-between gap-3 text-xs text-muted-foreground"><div className="flex flex-wrap items-center gap-2"><span>{nota.autor}</span><span>•</span><span>{format(new Date(nota.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span></div>{!isEditing && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingNoteId(nota.id); setEditingNoteText(nota.texto); }} aria-label="Editar nota"><Pencil className="h-3.5 w-3.5" /></Button>}</div>{isEditing ? <div className="space-y-2"><Textarea value={editingNoteText} onChange={(e) => setEditingNoteText(e.target.value)} rows={3} autoFocus /><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => { setEditingNoteId(null); setEditingNoteText(""); }} disabled={updateNote.isPending}><X className="h-3.5 w-3.5 mr-1" />Cancelar</Button><Button size="sm" onClick={() => saveEditNote(nota.id)} disabled={!editingNoteText.trim() || updateNote.isPending}>{updateNote.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}Salvar</Button></div></div> : <p className="text-sm text-foreground whitespace-pre-wrap">{nota.texto}</p>}</div>; })}</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6"><h2 className="text-lg font-semibold text-foreground mb-4">Informações da Empresa</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="bg-secondary/30 rounded-lg p-4"><p className="text-xs text-muted-foreground mb-1">Empresa</p><p className="text-foreground font-medium">{lead.empresa}</p></div><div className="bg-secondary/30 rounded-lg p-4"><p className="text-xs text-muted-foreground mb-1">Porte</p><p className="text-foreground font-medium">{lead.porte_empresa}</p></div><div className="bg-secondary/30 rounded-lg p-4"><p className="text-xs text-muted-foreground mb-1">Departamento</p><p className="text-foreground font-medium">{lead.departamento}</p></div></div></motion.div>
      </div>
      <LeadEditDialog lead={lead} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
};

export default LeadDetail;
