import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Users,
  Calendar,
  MessageSquare,
  Plus,
  Loader2,
} from "lucide-react";
import { useLead, useAddNote, useUpdateLeadStatus } from "@/hooks/useLeads";
import { useLeadCampaignResponses } from "@/hooks/useCampaigns";
import { useAuth } from "@/hooks/useAuth";
import {
  statusLabels,
  statusColors,
  getMaturityLevel,
  maturityLabels,
  maturityColors,
  type LeadStatus,
} from "@/types/lead";
import { capitalizeWords } from "@/lib/formatName";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import allevoLogo from "@/assets/allevo-logo.png";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import { SalesIntelligenceSection } from "@/components/sales/SalesIntelligenceSection";

const LeadDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: lead, isLoading } = useLead(id || "");
  const { data: campaignResponses = [] } = useLeadCampaignResponses(id || "");
  const addNote = useAddNote();
  const updateStatus = useUpdateLeadStatus();
  const [newNote, setNewNote] = useState("");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Lead não encontrado</p>
          <Button onClick={() => navigate("/admin/dashboard")}>
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const score = lead.resultado_diagnostico?.percentage ?? 0;
  const maturityLevel = getMaturityLevel(score);
  const pillarScores = lead.resultado_diagnostico?.pillarScores || [];

  const radarData = pillarScores.map((p) => ({
    subject: p.pillarName,
    value: p.percentage,
    fullName: p.pillarName,
  }));

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNote.mutate({
      id: lead.id,
      nota: {
        data: new Date().toISOString(),
        autor: user?.email || "Admin",
        texto: newNote.trim(),
      },
    });
    setNewNote("");
  };

  const handleStatusChange = (newStatus: LeadStatus) => {
    updateStatus.mutate({ id: lead.id, status: newStatus });
  };

  return (
    <div className="min-h-screen py-6 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/dashboard")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <img
            src={allevoLogo}
            alt="Allevo for Business"
            className="h-8"
          />
        </motion.div>

        {/* Lead Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-display font-bold text-foreground">
                {capitalizeWords(lead.nome)}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {lead.empresa}
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4" />
                  {lead.cargo}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {lead.departamento}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Score Badge */}
              <div className="text-center">
                <div
                  className={`text-3xl font-bold ${
                    maturityLevel === "iniciante"
                      ? "text-red-400"
                      : maturityLevel === "intermediario"
                      ? "text-amber-400"
                      : maturityLevel === "avancado"
                      ? "text-blue-400"
                      : "text-emerald-400"
                  }`}
                >
                  {Math.round(score)}%
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium ${maturityColors[maturityLevel]}`}
                >
                  {maturityLabels[maturityLevel]}
                </div>
              </div>

              {/* Status Dropdown */}
              <Select value={lead.status} onValueChange={handleStatusChange}>
                <SelectTrigger
                  className={`w-[150px] ${statusColors[lead.status]} border-0`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contact Info */}
          <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-border/50">
            <a
              href={`mailto:${lead.email}`}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Mail className="w-4 h-4" />
              {lead.email}
            </a>
            <a
              href={`tel:${lead.telefone}`}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Phone className="w-4 h-4" />
              {lead.telefone}
            </a>
            <a
              href={`https://wa.me/${lead.telefone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-emerald-400 hover:underline"
            >
              <MessageSquare className="w-4 h-4" />
              WhatsApp
            </a>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Perfil por Pilar
            </h2>
            {radarData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 100]}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    />
                    <Radar
                      name="Score"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Dados do diagnóstico não disponíveis
              </p>
            )}
          </motion.div>

          {/* Pillar Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Detalhamento por Pilar
            </h2>
            <div className="space-y-3">
              {pillarScores.map((pillar) => {
                const pillarMaturity = getMaturityLevel(pillar.percentage);
                return (
                  <div key={pillar.pillarId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span>{pillar.icon}</span>
                        <span className="text-foreground">{pillar.pillarName}</span>
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${maturityColors[pillarMaturity]}`}
                      >
                        {Math.round(pillar.percentage)}%
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pillarMaturity === "iniciante"
                            ? "bg-red-500"
                            : pillarMaturity === "intermediario"
                            ? "bg-amber-500"
                            : pillarMaturity === "avancado"
                            ? "bg-blue-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${pillar.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Sales Intelligence Section */}
        <SalesIntelligenceSection lead={lead} />

        {/* Campaign Origin & Responses */}
        {(lead.campaign_name || campaignResponses.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-card p-6 space-y-4"
          >
            <div>
              <h2 className="text-lg font-semibold text-foreground">Campanha de Origem</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {lead.campaign_name || "—"}
                {lead.campaign_slug && (
                  <a
                    href={`/c/${lead.campaign_slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 text-primary hover:underline text-xs"
                  >
                    /c/{lead.campaign_slug}
                  </a>
                )}
              </p>
            </div>

            {campaignResponses.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-border/50">
                <h3 className="text-sm font-semibold">Respostas</h3>
                {Object.entries(
                  campaignResponses.reduce((acc: Record<string, any[]>, r: any) => {
                    const cat = r.question?.category || "Geral";
                    (acc[cat] = acc[cat] || []).push(r);
                    return acc;
                  }, {})
                ).map(([cat, items]) => (
                  <div key={cat} className="space-y-2">
                    <p className="text-xs font-medium text-primary">{cat}</p>
                    {items.map((r: any) => (
                      <div key={r.id} className="bg-secondary/30 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">
                          {r.question?.question_text || "—"}
                        </p>
                        <p className="text-sm text-foreground">{r.answer_text || "—"}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Notes Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Notas
          </h2>

          {/* Add Note */}
          <div className="flex gap-2 mb-4">
            <Textarea
              placeholder="Adicionar uma nota..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="bg-card border-border/50 resize-none"
              rows={2}
            />
            <Button
              onClick={handleAddNote}
              disabled={!newNote.trim() || addNote.isPending}
              className="shrink-0"
            >
              {addNote.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Notes List */}
          <div className="space-y-3">
            {lead.notas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma nota ainda
              </p>
            ) : (
              [...lead.notas].reverse().map((nota) => (
                <div
                  key={nota.id}
                  className="bg-secondary/30 rounded-lg p-3 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{nota.autor}</span>
                    <span>
                      {format(new Date(nota.data), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{nota.texto}</p>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Company Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Informações da Empresa
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-secondary/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Empresa</p>
              <p className="text-foreground font-medium">{lead.empresa}</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Porte</p>
              <p className="text-foreground font-medium">{lead.porte_empresa}</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Departamento</p>
              <p className="text-foreground font-medium">{lead.departamento}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LeadDetail;
