import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Compass, Eye, Pencil, Save, Sparkles, Target, Users } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useMyRole } from "@/hooks/useMyRole";
import { toast } from "sonner";

type AboutData = { mission: string; vision: string; values: string[] };

const DEFAULT_MISSION = `Mais do que organizar vendas

O Segly existe para ajudar pessoas e negócios a crescerem com clareza, responsabilidade e cuidado.

No Segly, acreditamos que tecnologia deve aproximar pessoas, não reduzi-las a números.

Por isso, criamos uma plataforma para ajudar consultores e corretoras a organizarem oportunidades, cumprirem combinados e acompanharem cada cliente com mais atenção.

Vender bem não é pressionar. É compreender necessidades, orientar com clareza e construir confiança.

Quando existe processo, existe mais tempo para ouvir. Quando existe organização, menos pessoas ficam sem resposta. Quando existe responsabilidade, o crescimento se torna mais sustentável.

O Segly é feito para quem quer crescer com consistência, servir melhor e construir uma operação comercial da qual possa se orgulhar.

“Crescer com propósito é servir melhor.”`;

const FEATURES = [
  { title: "Dashboard", access: "Todos os usuários", text: "Visão rápida da operação comercial e dos principais indicadores.", items: ["Filtros por período e, para líderes/administradores, por colaborador visível.", "Gráfico de evolução de leads por período.", "Indicadores de leads, andamento, clientes convertidos, execução no prazo, follow-ups, atividades e contatos.", "Funil atual, prioridades e acesso aos leads recentes."] },
  { title: "Pipelines", access: "Todos os usuários", text: "Acompanhamento visual da jornada comercial.", items: ["Cards podem ser arrastados livremente entre etapas e ordenados dentro de cada coluna.", "Ao entrar em nova etapa, exibe perguntas configuradas; é possível responder agora ou depois.", "Pesquisa, filtro por responsável, ordenação, filtros fixáveis e exportação CSV.", "As informações preenchidas são preservadas etapa a etapa no detalhe do lead."] },
  { title: "Leads", access: "Todos os usuários", text: "Base central de oportunidades e detalhe completo de cada lead.", items: ["Reúne Informações iniciais, dados das etapas percorridas, atividades, propostas e histórico.", "Campos permanecem editáveis posteriormente pelo ícone de lápis.", "Alterações relevantes alimentam o Log de alterações."] },
  { title: "Cadastrar Leads", access: "Todos os usuários", text: "Cadastro manual usando o formulário padrão da operação.", items: ["Valida os campos essenciais e os campos obrigatórios do formulário de entrada.", "Permite copiar e abrir o link público do formulário sem login.", "Cria o lead no pipeline padrão e abre o registro após o cadastro."] },
  { title: "Clientes", access: "Todos os usuários", text: "Área dos leads convertidos em clientes.", items: ["Mantém vínculo com lead original, responsável e origem da conversão.", "Facilita o acompanhamento da carteira convertida."] },
  { title: "Standby", access: "Todos os usuários", text: "Visão das oportunidades temporariamente pausadas.", items: ["Centraliza leads que devem aguardar um novo momento de contato.", "Permite retomar a abordagem com base nas informações e atividades registradas."] },
  { title: "Agenda", access: "Todos os usuários", text: "Gestão de atividades e compromissos relacionados aos leads.", items: ["Criar, editar, concluir e reagendar atividades.", "Diferencia atividades atrasadas, previstas para hoje e futuras.", "Registra follow-ups, contatos, visitas, reuniões e retornos."] },
  { title: "Produtos", access: "Administradores", text: "Cadastro de operadoras, produtos e regras comerciais.", items: ["Define categoria, tipo de contratação, observações e percentuais de comissão.", "Alimenta propostas, implantação e cálculo de comissões."] },
  { title: "Desempenho e Comissões", access: "Líderes e administradores", text: "Painel integrado de produtividade, remuneração e fechamento financeiro.", items: ["Filtra toda a página por colaborador e período.", "Compara desempenho com o período anterior equivalente.", "Mostra ranking da equipe ou visão individual.", "Exibe previsão do próximo pagamento com salário, comissão prevista e total estimado.", "Mantém lançamentos, fechamento, confirmação de pagamento e histórico financeiro."] },
  { title: "Meu Perfil", access: "Todos os usuários", text: "Área pessoal para manutenção de dados e preferências.", items: ["Atualização de dados pessoais, endereço e senha.", "Preferências do Princípio do Dia e princípios salvos."] },
  { title: "Usuários e Permissões", access: "Administradores", text: "Gestão de acesso e estrutura da equipe.", items: ["Cadastro e administração de usuários.", "Perfis de administrador, líder e usuário operacional.", "Controle de usuários ativos e relações de liderança."] },
  { title: "Log de alterações", access: "Líderes e administradores", text: "Histórico cronológico das mudanças realizadas no sistema.", items: ["Filtro por intervalo de datas.", "Mostra o que mudou, valores anterior e novo, autor, data e horário.", "Inclui movimentações, edições de campos, formulários, produtos, permissões, configurações, propostas e atividades."] },
  { title: "Configurações", access: "Administradores", text: "Centro de configuração da operação.", items: ["Geral: empresa, logo, tema, responsável padrão, notificações e preferências.", "Pipeline: pipelines, etapas e campos.", "Celebrações: eventos associados às etapas.", "Construtor de Formulário: formulários, campos, ordem, obrigatoriedade e formulário padrão."] },
  { title: "Sobre o sistema", access: "Todos os usuários", text: "Página institucional e de ajuda do Segly.", items: ["Missão, Visão, Valores e Funcionalidades.", "Missão, Visão e Valores são editáveis apenas por administradores."] },
];

export default function SobreSistemaPage() {
  const { data: role } = useMyRole();
  const isAdmin = role === "admin";
  const qc = useQueryClient();
  const [editing, setEditing] = useState<"mission" | "vision" | "values" | null>(null);
  const [form, setForm] = useState<AboutData>({ mission: DEFAULT_MISSION, vision: "", values: ["", "", "", "", ""] });
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["about-system"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Usuário não autenticado.");
      const { data: profile, error: profileError } = await supabase.from("profiles").select("organization_id").eq("id", auth.user.id).maybeSingle();
      if (profileError) throw profileError;
      if (!profile?.organization_id) throw new Error("Organização não encontrada.");
      const { data: settings, error } = await supabase.from("organization_settings" as never).select("organization_id,extra").eq("organization_id", profile.organization_id).single();
      if (error) throw error;
      const extra = ((settings as unknown as { extra?: Record<string, unknown> }).extra ?? {}) as Record<string, unknown>;
      const about = (extra.about_system ?? {}) as Partial<AboutData>;
      return {
        organizationId: profile.organization_id,
        extra,
        about: {
          mission: about.mission || DEFAULT_MISSION,
          vision: about.vision || "",
          values: Array.isArray(about.values) ? [...about.values.map(String), "", "", "", "", ""].slice(0, 5) : ["", "", "", "", ""],
        } as AboutData,
      };
    },
  });

  useEffect(() => { if (data?.about) setForm(data.about); }, [data]);

  const save = async (section: "mission" | "vision" | "values") => {
    if (!isAdmin || !data) return;
    setSaving(true);
    try {
      const about = { ...data.about, ...form };
      const extra = { ...data.extra, about_system: about };
      const { error } = await supabase.from("organization_settings" as never).update({ extra, updated_at: new Date().toISOString() } as never).eq("organization_id", data.organizationId);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["about-system"] });
      setEditing(null);
      toast.success(`${section === "mission" ? "Missão" : section === "vision" ? "Visão" : "Valores"} atualizada.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally { setSaving(false); }
  };

  const editButton = (section: "mission" | "vision" | "values") => isAdmin && editing !== section ? (
    <Button variant="outline" size="sm" onClick={() => setEditing(section)}><Pencil className="h-4 w-4 mr-2" />Editar</Button>
  ) : null;

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="mx-auto w-full max-w-6xl p-3 sm:p-4 lg:p-6 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-2xl font-display font-bold">Sobre o sistema</h1><p className="text-sm text-muted-foreground">Propósito, cultura e guia de uso do Segly.</p></div>
        {isAdmin && <Badge variant="secondary"><Pencil className="h-3.5 w-3.5 mr-1" />Missão, Visão e Valores editáveis</Badge>}
      </div>

      <Tabs defaultValue="missao" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
          <TabsTrigger value="missao">Missão</TabsTrigger><TabsTrigger value="visao">Visão</TabsTrigger><TabsTrigger value="valores">Valores</TabsTrigger><TabsTrigger value="funcionalidades">Funcionalidades</TabsTrigger>
        </TabsList>

        <TabsContent value="missao" className="mt-4">
          <Card><CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2"><Compass className="h-5 w-5 text-primary" />Missão</CardTitle><CardDescription>Por que o Segly existe e como deseja servir.</CardDescription></div>{editButton("mission")}</CardHeader><CardContent>
            {editing === "mission" ? <div className="space-y-3"><Textarea value={form.mission} onChange={(e) => setForm({ ...form, mission: e.target.value })} rows={16} /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => { setForm(data?.about ?? form); setEditing(null); }}>Cancelar</Button><Button onClick={() => save("mission")} disabled={saving}><Save className="h-4 w-4 mr-2" />Salvar</Button></div></div> : <div className="whitespace-pre-wrap text-sm leading-7 text-foreground">{form.mission}</div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="visao" className="mt-4">
          <Card><CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5 text-primary" />Visão</CardTitle><CardDescription>Onde a empresa pretende chegar e o futuro que deseja construir.</CardDescription></div>{editButton("vision")}</CardHeader><CardContent>
            {editing === "vision" ? <div className="space-y-3"><Textarea value={form.vision} onChange={(e) => setForm({ ...form, vision: e.target.value })} rows={10} placeholder="Escreva a visão da empresa..." /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => { setForm(data?.about ?? form); setEditing(null); }}>Cancelar</Button><Button onClick={() => save("vision")} disabled={saving}><Save className="h-4 w-4 mr-2" />Salvar</Button></div></div> : <p className={form.vision ? "text-sm leading-7" : "text-sm italic text-muted-foreground"}>{form.vision || "A ser preenchido pelos administradores."}</p>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="valores" className="mt-4">
          <Card><CardHeader className="flex flex-row items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Valores</CardTitle><CardDescription>Princípios e comportamentos que orientam a equipe.</CardDescription></div>{editButton("values")}</CardHeader><CardContent>
            {editing === "values" ? <div className="space-y-3">{form.values.map((value, index) => <Input key={index} value={value} onChange={(e) => { const next = [...form.values]; next[index] = e.target.value; setForm({ ...form, values: next }); }} placeholder={`Valor ${index + 1}`} />)}<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => { setForm(data?.about ?? form); setEditing(null); }}>Cancelar</Button><Button onClick={() => save("values")} disabled={saving}><Save className="h-4 w-4 mr-2" />Salvar</Button></div></div> : <div className="space-y-2">{form.values.filter(Boolean).length ? form.values.filter(Boolean).map((value, index) => <div key={index} className="flex items-start gap-3 rounded-lg border p-3"><Check className="h-4 w-4 mt-0.5 text-primary" /><span className="text-sm">{value}</span></div>) : <p className="text-sm italic text-muted-foreground">A ser preenchido pelos administradores.</p>}</div>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="funcionalidades" className="mt-4 space-y-4">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" />Funcionalidades</CardTitle><CardDescription>Manual vivo do Segly, organizado pela mesma lógica do menu.</CardDescription></CardHeader></Card>
          <div className="grid gap-4 lg:grid-cols-2">{FEATURES.map((feature) => <Card key={feature.title} className="min-w-0"><CardHeader className="pb-3"><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="text-base">{feature.title}</CardTitle><Badge variant="outline">{feature.access}</Badge></div><CardDescription>{feature.text}</CardDescription></CardHeader><CardContent><ul className="space-y-2">{feature.items.map((item) => <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground"><Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" /><span>{item}</span></li>)}</ul></CardContent></Card>)}</div>
          <Card className="border-primary/20"><CardContent className="p-4 text-sm text-muted-foreground flex items-start gap-3"><Users className="h-5 w-5 text-primary shrink-0" /><p><strong className="text-foreground">Perfis de acesso:</strong> usuários operam seus leads e atividades; líderes acompanham a equipe visível; administradores gerenciam toda a operação e suas configurações.</p></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
