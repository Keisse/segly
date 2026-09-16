import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Phone, Trash2, Eye, Pencil, Building2, CalendarClock } from "lucide-react";
import type { Lead } from "@/types/lead";
import { useDeleteLead, useUpdateLeadOwner } from "@/hooks/useLeads";
import { ResponsavelPicker } from "@/components/admin/ResponsavelPicker";
import { StagePicker } from "@/components/admin/StagePicker";
import { LeadEditDialog } from "@/components/admin/LeadEditDialog";
import { capitalizeWords } from "@/lib/formatName";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadsTableProps {
  leads: Lead[];
  isLoading?: boolean;
}

const ITEMS_PER_PAGE = 20;

const LeadsTable = ({ leads, isLoading }: LeadsTableProps) => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Lead>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const deleteLead = useDeleteLead();
  const updateOwner = useUpdateLeadOwner();

  const sortedLeads = [...leads].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    if (sortDirection === "asc") return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });

  const totalPages = Math.ceil(sortedLeads.length / ITEMS_PER_PAGE);
  const paginatedLeads = sortedLeads.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleSort = (field: keyof Lead) => {
    if (sortField === field) setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDirection("desc"); }
  };

  if (isLoading) return <div className="glass-card p-8 text-center"><div className="animate-pulse text-muted-foreground">Carregando vidas...</div></div>;
  if (leads.length === 0) return <div className="glass-card p-8 text-center"><p className="text-muted-foreground">Nenhuma vida encontrada.</p></div>;

  const Pagination = () => totalPages > 1 ? (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-border/50">
      <p className="text-xs sm:text-sm text-muted-foreground">Mostrando {(page - 1) * ITEMS_PER_PAGE + 1} a {Math.min(page * ITEMS_PER_PAGE, leads.length)} de {leads.length} vidas</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1}><ChevronLeft className="w-4 h-4" /></Button>
        <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Página {page} de {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page === totalPages}><ChevronRight className="w-4 h-4" /></Button>
      </div>
    </div>
  ) : null;

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card w-full max-w-full overflow-hidden">
        <div className="hidden xl:block w-full max-w-full overflow-x-auto">
          <Table>
            <TableHeader><TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort("created_at")}>Data/Hora {sortField === "created_at" && (sortDirection === "asc" ? "↑" : "↓")}</TableHead>
              <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort("nome")}>Nome {sortField === "nome" && (sortDirection === "asc" ? "↑" : "↓")}</TableHead>
              <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort("empresa")}>Empresa {sortField === "empresa" && (sortDirection === "asc" ? "↑" : "↓")}</TableHead>
              <TableHead>Porte</TableHead><TableHead>Departamento</TableHead><TableHead>Cargo</TableHead><TableHead>Campanha</TableHead><TableHead>Responsável</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {paginatedLeads.map((lead) => (
                <TableRow key={lead.id} className="border-border/50 hover:bg-secondary/30">
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                  <TableCell><button onClick={() => navigate(`/admin/lead/${lead.id}`)} className="font-medium text-primary hover:underline text-left">{capitalizeWords(lead.nome)}</button></TableCell>
                  <TableCell>{lead.empresa}</TableCell><TableCell className="text-sm">{lead.porte_empresa}</TableCell><TableCell className="text-sm">{lead.departamento}</TableCell><TableCell className="text-sm">{lead.cargo}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{lead.campaign_name || "—"}</TableCell>
                  <TableCell><ResponsavelPicker value={lead.owner_id} onChange={(uid) => updateOwner.mutate({ id: lead.id, ownerId: uid })} /></TableCell>
                  <TableCell><StagePicker leadId={lead.id} pipelineId={lead.pipeline_id} stageId={lead.stage_id} /></TableCell>
                  <TableCell className="text-right"><div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingLead(lead)} title="Editar vida"><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/admin/lead/${lead.id}`)} title="Ver detalhes"><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild><a href={`tel:${lead.telefone}`} title="Ligar"><Phone className="w-4 h-4" /></a></Button>
                    <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border"><AlertDialogHeader><AlertDialogTitle>Excluir Vida</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir a vida <strong>{capitalizeWords(lead.nome)}</strong>? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteLead.mutate(lead.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                    </AlertDialog>
                  </div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="xl:hidden divide-y divide-border/50">
          {paginatedLeads.map((lead) => (
            <div key={lead.id} className="p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <button onClick={() => navigate(`/admin/lead/${lead.id}`)} className="text-left font-semibold text-primary hover:underline break-words">{capitalizeWords(lead.nome)}</button>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarClock className="h-3.5 w-3.5 shrink-0" />{format(new Date(lead.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingLead(lead)} title="Editar vida"><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/admin/lead/${lead.id}`)} title="Ver detalhes"><Eye className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild><a href={`tel:${lead.telefone}`} title="Ligar"><Phone className="w-4 h-4" /></a></Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/30 p-3 min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Empresa</p>
                  <p className="mt-1 text-sm font-medium break-words flex items-start gap-1.5"><Building2 className="h-4 w-4 mt-0.5 shrink-0" />{lead.empresa || "—"}</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-3 min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Perfil</p>
                  <p className="mt-1 text-sm break-words">{[lead.porte_empresa, lead.departamento, lead.cargo].filter(Boolean).join(" · ") || "—"}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="min-w-0"><p className="mb-1.5 text-xs text-muted-foreground">Responsável</p><ResponsavelPicker value={lead.owner_id} onChange={(uid) => updateOwner.mutate({ id: lead.id, ownerId: uid })} /></div>
                <div className="min-w-0"><p className="mb-1.5 text-xs text-muted-foreground">Etapa</p><StagePicker leadId={lead.id} pipelineId={lead.pipeline_id} stageId={lead.stage_id} /></div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                {lead.campaign_name && <Badge variant="outline" className="max-w-[70%] truncate">{lead.campaign_name}</Badge>}
                <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4 mr-1.5" />Excluir</Button></AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-border"><AlertDialogHeader><AlertDialogTitle>Excluir Vida</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir a vida <strong>{capitalizeWords(lead.nome)}</strong>? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteLead.mutate(lead.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>

        <Pagination />
      </motion.div>

      {editingLead && <LeadEditDialog lead={editingLead} open={!!editingLead} onOpenChange={(open) => !open && setEditingLead(null)} />}
    </>
  );
};

export default LeadsTable;
