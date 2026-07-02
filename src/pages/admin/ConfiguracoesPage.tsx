import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";

const Placeholder = ({ title, description }: { title: string; description: string }) => (
  <Card className="p-8">
    <h2 className="text-lg font-semibold">{title}</h2>
    <p className="text-sm text-muted-foreground mt-2">{description}</p>
    <p className="text-xs text-muted-foreground mt-6">Em breve.</p>
  </Card>
);

const ConfiguracoesPage = () => {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Área administrativa para regras, padrões e integrações do sistema.
        </p>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="pipeline">Configurações de Pipeline</TabsTrigger>
          <TabsTrigger value="celebracoes">Celebrações e Reconhecimento</TabsTrigger>
          <TabsTrigger value="automacoes">Automações</TabsTrigger>
          <TabsTrigger value="integracoes">Integrações</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-4">
          <Placeholder
            title="Geral"
            description="Nome da empresa, fuso horário, logo e preferências gerais do workspace."
          />
        </TabsContent>
        <TabsContent value="pipeline" className="mt-4">
          <Placeholder
            title="Configurações de Pipeline"
            description="Etapas, campos, regras e permissões das pipelines usadas pela operação."
          />
        </TabsContent>
        <TabsContent value="celebracoes" className="mt-4">
          <Placeholder
            title="Celebrações e Reconhecimento"
            description="Gatilhos de celebração de vitórias e regras de reconhecimento do time."
          />
        </TabsContent>
        <TabsContent value="automacoes" className="mt-4">
          <Placeholder
            title="Automações"
            description="Gatilhos e ações automáticas para agilizar a operação comercial."
          />
        </TabsContent>
        <TabsContent value="integracoes" className="mt-4">
          <Placeholder
            title="Integrações"
            description="Webhooks, chaves e conexões com sistemas externos."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConfiguracoesPage;

