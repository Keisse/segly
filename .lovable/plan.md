# Plano: Formulário Padrão + Cadastro rápido de leads

## 1. Configurações › aba

- Em `ConfiguracoesPage.tsx`, ocultar a aba **Automações** (código preservado, apenas comentado — permite retomada futura) e adicionar **Formulário Padrão** no lugar.
- Conteúdo da aba só renderiza para admins (`useIsAdmin`); líder/user veem mensagem "Somente administradores".

## 2. Banco de dados (migração única)

Novas tabelas em `public`, escopo por organização, com GRANTs e RLS:

- `**lead_form_fields**` — definição do formulário padrão da organização.
  - `organization_id`, `field_key` (slug interno, único por org), `label`, `type` (enum: `short_text`, `long_text`, `email`, `phone`, `number`, `date`, `select`, `multiselect`, `checkbox`, `company`), `required`, `active`, `ordem`, `placeholder`, `help_text`, `default_value`, `options` (jsonb array), `validation` (jsonb), `is_system` (bool — marca campos padrão que não podem ser excluídos, só desativados), `maps_to` (nullable — nome de coluna nativa em `leads` como `nome`, `email`, `telefone`, `empresa`, `cargo`).
  - RLS: SELECT para `authenticated same org`; INSERT/UPDATE/DELETE apenas admin da org; `is_system=true` não pode ser deletado (trigger).
- `**leads.custom_fields jsonb**` — coluna nova em `leads` (default `'{}'::jsonb`) guarda respostas de campos personalizados. Campos que têm `maps_to` continuam gravados nas colunas nativas existentes — nenhuma quebra de query/filtro/RLS.
- **Seed**: função `seed_default_lead_form(org_id)` resgata o formulário em anexo (nome, telefone, e-mail corporativo, empresa, porte, departamento, cargo) com `is_system=true`. Trigger em `organizations` chama seed em novas orgs; migração roda seed para orgs existentes que ainda não têm campos.
- **RPC `restore_default_lead_form()**` — admin only; apaga campos `is_system=true` e re-seeda.

## 3. Frontend

### Aba "Formulário Padrão" (`src/components/admin/LeadFormBuilder.tsx`)

- Abre o formulário que está em anexo para edição
- Lista ordenável (drag&drop com `@dnd-kit` já instalado) de campos.
- Cada linha: toggle Ativo, badge "Sistema" quando `is_system`, botão editar, botão excluir (desabilitado se sistema).
- Dialog de edição/criação com todos os atributos (tipo, label, key, required, placeholder, help, default, opções para select/multiselect, validação simples regex/min/max).
- Botão "Restaurar padrão" com confirmação.

### Modal "+ Novo Lead" (`src/components/leads/NovoLeadDialog.tsx`)

- Componente único reutilizado. Renderiza dinamicamente os campos ativos da org, ordenados.
- Extras fixos abaixo dos campos configuráveis: **Responsável** (usa `ResponsavelPicker` — `list_org_members`), **Pipeline** (padrão pré-selecionado, editável), **Etapa** (primeira etapa "Novo/Prospecção" do pipeline escolhido).
- Validação em tempo real conforme config (`required`, tipo, regex).
- Submit → insert em `leads`:
  - Colunas nativas preenchidas via `maps_to`.
  - Restante em `custom_fields`.
  - `organization_id = my_org()`, `owner_id = selecionado ou auth.uid()`, `pipeline_id`, `stage_id` (primeira etapa).
  - Trigger `leads_apply_default_pipeline` + `leads_log_history` (já existentes) cuidam de default e timeline; adiciona-se um evento extra: "Lead cadastrado manualmente por X" via patch no trigger de INSERT (ajuste em `leads_log_history` para diferenciar origem quando `source='manual'`).
- Ao sucesso: `queryClient.invalidateQueries` em `leads`, `leads-by-pipeline`, `dashboard-*` — realtime já ativo cobre outras sessões.

### Botão em Leads e Dashboard

- Adicionado em `LeadsPage.tsx` e `AdminDashboard.tsx` no header (visível a todos os autenticados). Abre o mesmo dialog.

## 4. Permissões

- RLS bloqueia escritas em `lead_form_fields` para não-admins.
- Rota `/admin/configuracoes?tab=formulario` acessível a todos, mas o conteúdo verifica `useIsAdmin` e renderiza fallback.
- Campo "Responsável" no modal usa `list_org_members` (já filtra `is_active` e mesma org).
- Etapas limitadas ao `pipeline_id` selecionado via query filtrada.

## 5. Impacto em código existente

- `ConfiguracoesPage.tsx`: troca de aba.
- `LeadsPage.tsx`, `AdminDashboard.tsx`: header ganha botão.
- `leads_log_history` (função): passa a diferenciar origem manual.
- Nenhuma alteração em Kanban/Pipelines além da invalidação de cache — cards já usam `useLeadsByPipelin e`.

## 6. Entregáveis

Após aprovação implementarei em 2 passos:

1. Migração (nova tabela, coluna `custom_fields`, seed, RPC, ajuste do trigger de histórico).
2. Frontend (LeadFormBuilder, NovoLeadDialog, botões, ajuste da aba).

Confirma para eu prosseguir?