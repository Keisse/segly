## Objetivo
Unificar o lead como oportunidade única entre Leads, Pipelines e Dashboard, com responsáveis vinculados a usuários reais e status sincronizado com a etapa do pipeline em tempo real.

## 1. Banco de dados (migração)
- **`profiles`**: adicionar `is_active boolean NOT NULL DEFAULT true` (permite desativar sem deletar).
- **`leads`**:
  - adicionar `responsible_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL` (index).
  - manter `responsavel` (texto) apenas como histórico legado — não usar mais para novas atribuições.
  - trigger `leads_default_pipeline`: em `INSERT`, se `pipeline_id` for nulo, buscar o pipeline `is_default = true` da organização e a primeira `pipeline_stage` (menor `ordem`) e preencher `pipeline_id` + `stage_id`. Se não houver pipeline padrão, `RAISE EXCEPTION` com mensagem clara.
  - trigger já existente `sync_lead_status_from_stage` já cobre won/lost. Estender: qualquer mudança de `stage_id` também dispara atualização de `status` mapeando etapas comuns (Novo→novo, Em contato→contatado, Qualificação/Proposta→em_analise, Negociação→em_negociacao). Fallback: manter status atual.
  - trigger para registrar em `historico` (jsonb) toda mudança de `stage_id` e `responsible_user_id`.
- **RLS**: manter políticas atuais (isolamento por organização e can_view_owner). Adicionar policy para SELECT em `profiles` da mesma organização (necessário para seletor de responsáveis) via função `same_org(_user_id)`.
- **Realtime**: `ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;` para propagação instantânea entre telas.

## 2. Backend — Edge function `submit-lead`
- Após inserir o lead, o trigger acima já garante pipeline/etapa. Remover qualquer lógica que dependa do campo texto `responsavel`.
- Passar `organization_id` da campanha/padrão para o lead novo.

## 3. Frontend — Hooks
- Novo hook `useOrgUsers()`: lista `profiles` da organização atual (filtrando `is_active = true` para novos assignments) com `id`, `display_name`, `avatar_url`, email (via join no `auth.users` não é possível — usar view segura `public.org_members` que já pode ser criada na migração retornando id/display_name/email/is_active/organization_id).
- Novo `useUpdateLeadResponsibleUser({ leadId, userId })`.
- `useLeads` e `useLeadsByPipeline`: incluir `responsible_user_id`, `pipeline_id`, `stage_id` no select e retornar join com perfil do responsável (display_name).
- Realtime: subscription única em `leads` dentro de `AdminLayout` que invalida `["leads"]`, `["leads-by-pipeline"]`, `["dashboard-metrics"]`.

## 4. Frontend — Tela Leads (`LeadsTable`)
- Coluna **Responsável**: substituir input livre por `<Select>` (popover com busca `Command`) listando usuários ativos da organização (`display_name` + email). Placeholder "Atribuir...". Salva `responsible_user_id`.
- Coluna **Status**: em vez de status fixo, popover mostrando as etapas do pipeline daquele lead (cor + nome). Ao selecionar, chama `useUpdateLeadStage` (mesma mutation do Kanban). Se etapa `is_lost`, abre dialog pedindo motivo (registrado em `historico`).
- Se lead não tiver `pipeline_id`, mostrar aviso "Sem pipeline" com botão para atribuir ao padrão.

## 5. Frontend — Kanban (`KanbanPage`)
- Cards passam a mostrar: nome, empresa, **responsável (display_name)**, **email**, **telefone com ícone WhatsApp clicável** (`https://wa.me/<numero>`).
- Drag-and-drop já usa `useUpdateLeadStage` — mantém. Após mutação, invalidar `dashboard-metrics` também.

## 6. Frontend — Dashboard
- `useDashboardMetrics` passa a agregar por `stage_id` (via join com `pipeline_stages`) em vez de `status` isolado, garantindo consistência com Kanban. Filtros por pipeline/responsável/organização já aceitos.
- Realtime subscription no `AdminLayout` invalida as métricas automaticamente.

## 7. Permissões
- Botão de atribuir responsável só habilitado para `admin`/`lider` (via `useMyRole`).
- Configuração de pipeline padrão restrita a admin (`PipelineSettings`).

## 8. Detalhes técnicos
```text
leads
 ├── pipeline_id ──► pipelines (is_default por org)
 ├── stage_id    ──► pipeline_stages (fonte única do status)
 ├── responsible_user_id ──► auth.users / profiles
 └── (realtime) ──► React Query invalidations
```

## Fora de escopo (esta iteração)
- Migração de dados legados: leads com `responsavel` texto continuam exibindo o texto até que um responsável real seja atribuído.
- Motivo de perda configurável por pipeline: ficará como texto livre no dialog.
- Automações condicionais avançadas por etapa (já existe celebração — mantida).
