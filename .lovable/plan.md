
# Plano — Área de Configurações do Segly

O escopo é grande e envolve backend (várias tabelas novas, RLS, storage, eventos centrais), frontend (5 abas ricas com CRUD, drag-and-drop, campos personalizados, editor de automações) e um componente global de celebração. Para entregar com qualidade e sem quebrar o Segly atual, proponho dividir em **4 fases sequenciais**, cada uma testável e "shippable".

## Visão geral da arquitetura

- **Multi-tenant leve**: já existe `profiles` com `lider_id`. Vou introduzir `organization_id` (uuid) em `profiles` e nas tabelas de configuração, para que cada empresa tenha suas próprias regras. Para os usuários já existentes, uma organização padrão será criada.
- **Acesso**: rota `/admin/configuracoes` envolvida em `AdminOnlyRoute` (já existe). Backend com RLS `is_admin() AND organization_id = my_org()`. Página de "Acesso negado" reaproveitável.
- **Eventos centrais**: qualquer mudança de etapa de lead dispara `lead_won` / `lead_lost` via classificação `open|won|lost` da etapa — nunca pelo nome da coluna. Ponte no `useLeads` (mutação de etapa) + trigger DB que insere em `event_log`.
- **Componente global de celebração**: `<CelebrationHost/>` montado no `AdminLayout`, escuta um `celebrationBus` (event emitter) alimentado pelos eventos `lead_won` / `sale_completed`. Confetes via `canvas-confetti`.
- **Auditoria**: tabela `audit_log` (quem, quando, o quê, valor anterior/novo) para mudanças administrativas.

## Fase 1 — Fundamentos e Aba Geral

1. Migração:
   - `organizations` (nome, e-mail, telefone, cidade, uf, fuso, logo_url, defaults)
   - `organization_id` em `profiles`, `leads`, `campaigns`, `clientes` (nullable + backfill p/ uma org padrão)
   - `organization_settings` (jsonb: notificações, responsável padrão, dias sem interação, histórico ativo)
   - `audit_log`
   - Funções `my_org()`, RLS em todas as novas tabelas, GRANTs
   - Bucket público `organization-logos`
2. Página `/admin/configuracoes` refatorada com header, subtítulo, `Tabs` responsivas, prompt "alterações não salvas" via hook `useUnsavedChanges` + `beforeunload` + bloqueio de navegação React Router.
3. Aba **Geral** completa (dados da empresa, upload de logo, preferências, notificações gerais), botão Salvar, toasts sonner.

## Fase 2 — Pipelines (estrutural)

1. Migração:
   - `pipelines` (nome, descrição, ícone, is_default, is_archived, org_id)
   - `pipeline_stages` (pipeline_id, nome, descrição, cor, ordem, `status_class` ENUM `open|won|lost`, is_archived)
   - `pipeline_access` (pipeline_id, role/user_id/lider_id)
   - `custom_fields` (pipeline_id, stage_id?, tipo, label, obrigatório em open/won/lost)
   - `lead_stage_history` (lead_id, from_stage, to_stage, changed_by, at)
   - Adaptar `leads.stage_id` (nova coluna, backfill), manter `status` legada por compatibilidade
   - Trigger que grava em `lead_stage_history` e insere `event_log` `lead_won`/`lead_lost` conforme `status_class` da nova etapa
2. UI Aba **Configurações de Pipeline**:
   - Aviso explicativo (diferença de Pipelines do menu)
   - Lista de pipelines (criar, editar, arquivar, definir padrão, duplicar, gerenciar acesso)
   - Editor de etapas com drag-and-drop (`@dnd-kit`), cor, classificação
   - Modal de confirmação ao classificar como Ganho/Perdido
   - Editor de campos personalizados e obrigatoriedade por status
   - Bloqueio de exclusão quando há leads (apenas arquivar)
3. Ajustar `KanbanPage` para ler `pipeline_stages` (mantendo fallback para o Kanban atual).

## Fase 3 — Celebrações e componente global

1. Migração: `celebration_settings` (org_id, enabled, on_won, on_sale, intensity `discreta|padrao|comemorativa|off`).
2. `celebrationBus` (event emitter) + `<CelebrationHost/>` global no `AdminLayout` com `canvas-confetti` (dependência nova).
3. Hook `useCelebrate()` para telas dispararem eventos sem lógica local.
4. Ligação com o trigger DB: `useLeads` observa mutação de etapa; ao receber resposta `won/lost`, chama `celebrate('lead_won')`.
5. Guarda anti-duplicação: só celebra na *transição* real; se o lead já estava won, não celebra novamente (verificação pelo `lead_stage_history`).
6. UI da aba com switches, seletor de intensidade, botão "Testar comemoração" e nota informativa.

## Fase 4 — Automações e Integrações

1. Migração:
   - `automations` (org_id, nome, status `active|paused|archived`, trigger jsonb, conditions jsonb, actions jsonb, criado_por)
   - `automation_runs` (automation_id, lead_id, ações executadas, resultado, at)
2. UI Aba **Automações**:
   - Lista com filtros e status
   - Wizard "Quando → Se → Então" com selects de gatilhos, condições e ações listadas no briefing
   - Ativar / pausar / duplicar / testar / arquivar
   - Histórico de execuções
3. Executor server-side simples via edge function `run-automations`, chamada por trigger DB quando `event_log` recebe novo evento (`lead_created`, `lead_won`, etc.). Loop-guard: cada `automation_run` marca `lead_id + automation_id + event_id` (unique) para não repetir.
4. Aba **Integrações**: já existe o placeholder — nesta fase apenas listar webhooks configuráveis por org (`integrations` table: nome, url, eventos assinados, secret). Envio real reaproveita `send-webhook` edge function.

## Detalhes técnicos

- Novas dependências: `canvas-confetti`, `@dnd-kit/core`, `@dnd-kit/sortable`.
- Formulários com `react-hook-form` + `zod` (já em uso no projeto).
- Toasts: `sonner`.
- Estado servidor: `@tanstack/react-query` (padrão do projeto).
- Nenhuma alteração em `client.ts`, `types.ts` ou `.env`.
- Rota já existente `/admin/configuracoes` continua a mesma; nada de breaking change no Kanban / Leads (colunas legadas mantidas até a migração ser 100% adotada).

## O que preciso confirmar antes de começar

1. **Fase 1 primeiro (Geral + fundação multi-tenant)** e seguirmos incrementalmente por chat? Recomendo fortemente — o escopo total é grande demais para uma única entrega segura.
2. **Organização única padrão** para todos os usuários atuais (podemos separar por cliente depois) — ok?
3. Aba **Integrações**: no briefing só é citada na lista, sem requisitos detalhados. Posso manter o placeholder atual na Fase 1 e implementar webhooks básicos na Fase 4 — confirma?

Aprovando, começo imediatamente pela **Fase 1**.
