import { useNavigate } from "react-router-dom";
import { Plus, Copy, Edit, Trash2, ExternalLink, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useCampaigns, useDeleteCampaign, useDuplicateCampaign, useUpdateCampaign,
  useCampaignLeadsCount,
} from "@/hooks/useCampaigns";
import { campaignTypeLabels } from "@/types/campaign";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export default function CampanhasPage() {
  const navigate = useNavigate();
  const { data: campaigns = [], isLoading } = useCampaigns();
  const { data: leadsCount = {} } = useCampaignLeadsCount();
  const del = useDeleteCampaign();
  const dup = useDuplicateCampaign();
  const upd = useUpdateCampaign();

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/c/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  return (
    <div className="py-6 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Campanhas</h1>
            <p className="text-sm text-muted-foreground">
              Crie e gerencie campanhas com URLs públicas dinâmicas
            </p>
          </div>
          <Button onClick={() => navigate("/admin/campanhas/nova")} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Campanha
          </Button>
        </div>

        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>Nome</TableHead>
                <TableHead>Slug (URL)</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell></TableRow>
              )}
              {!isLoading && campaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma campanha criada ainda
                  </TableCell>
                </TableRow>
              )}
              {campaigns.map((c) => (
                <TableRow key={c.id} className="border-border/50">
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">/c/{c.slug}</TableCell>
                  <TableCell className="text-xs">{campaignTypeLabels[c.type]}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={c.status === "ativa"}
                        onCheckedChange={(v) =>
                          upd.mutate({ id: c.id, status: v ? "ativa" : "inativa" })
                        }
                      />
                      <Badge variant={c.status === "ativa" ? "default" : "secondary"}>
                        {c.status === "ativa" ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{leadsCount[c.id] || 0}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => copyLink(c.slug)} title="Copiar link">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" asChild title="Abrir página">
                        <a href={`/c/${c.slug}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => dup.mutate(c.id)} title="Duplicar">
                        <Power className="w-4 h-4 rotate-90" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/campanhas/${c.id}`)} title="Editar">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir campanha?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Excluir <strong>{c.name}</strong> remove também perguntas e respostas vinculadas. Os leads permanecem.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => del.mutate(c.id)} className="bg-destructive">
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
