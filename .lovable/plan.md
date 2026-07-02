# Múltiplos Pipelines — Configurações ↔ Página Pipelines

## Análise do estado atual

- **Configurações > Pipeline** (`src/components/admin/PipelineSettings.tsx`): salva um único conjunto de etapas no JSON `organization_settings.settings.pipeline` (campos: `stages[]`, `default_stage_id`, `rotting_days`, `auto_move_days`, `require_reason_on_lost`). Não existe entidade "pipeline" no banco — apenas etapas soltas.
- **Página Pipelines** (`src/pages/admin/KanbanPage.tsx`): usa um enum fixo hardcoded (`novo`, `em_analise`, `contatado`, `em_negociacao`, `convertido`, `perdido`) através de `LeadStatus` em `src/types/lead.ts`. Não lê as etapas configuradas — ou seja, hoje Configurações > Pipeline **já está desconectada** do Kanban.
- **Leads** (`public.leads`): coluna `status` (enum `LeadStatus`), sem `pipeline_id` nem `stage_id`.

## Riscos para os leads atuais

1. `leads.status` é um enum aplicado em várias telas (Dashboard, LeadsTable, LeadDetail, Kanban, filtros, métricas). Trocar por FK para `pipeline_stages` quebra tudo se feito de uma vez.
2. Kanban legado depende do enum fixo — migrar os cards para etapas dinâmicas exige adaptar drag-and-drop, cores e labels.
3. Métricas do Dashboard agregam por `status`; se mudarmos a fonte, os gráficos precisam apontar para a nova coluna.

Estratégia para mitigar: **manter `leads.status` intacto como fallback** e adicionar colunas novas (`pipeline_id`, `stage_id`) opcionais. O Kanban passa a ler `stage_id` quando existir; leads antigos continuam funcionando via mapeamento do `status` para o pipeline padrão "Comercial".

## Modelo de dados (novo)

**`public.pipelines`**
- `organization_id` (FK), `nome`, `descricao`, `cor`, `ativo`, `arquivado`, `ordem`, `is_default`

**`public.pipeline_stages`**
- `pipeline_id` (FK, cascade), `nome`, `cor`, `ordem`, `wip_limit`, `is_won`, `is_lost`

**`public.leads`** (novas colunas nullable)
- `pipeline_id` (FK → pipelines, set null)
- `stage_id` (FK → pipeline_stages, set null)
- CHECK/trigger: `stage.pipeline_id = lead.pipeline_id`

Todas com RLS por `organization_id` reutilizando `my_org()` / `has_role()`, e GRANTs para `authenticated` + `service_role`.

## Migração dos dados

1. Criar pipeline padrão **"Comercial"** por organização existente (`is_default=true`).
2. Se `organization_settings.settings.pipeline.stages` existir, migrar essas etapas como `pipeline_stages` do pipeline "Comercial". Caso contrário, semear com: Novo → Em contato → Qualificação → Proposta → Negociação → Ganho → Perdido.
3. Backfill dos leads: `pipeline_id` = pipeline padrão da org; `stage_id` = mapear pelo `status` atual (novo→Novo, contatado→Em contato, em_negociacao→Negociação, convertido→Ganho, perdido→Perdido, em_analise→Qualificação).
4. `leads.status` continua existindo e sincroniza via trigger quando `stage_id` muda (won/lost/generic).

## Alterações no frontend

**`PipelineSettings.tsx`** — evoluir (não recriar):
- Adicionar seletor de pipeline no topo + botões "Novo pipeline", renomear, duplicar, arquivar, excluir.
- Modal "Novo pipeline" (nome, descrição, cor, checkbox "criar com etapas padrão").
- CRUD de etapas passa a operar sobre `pipeline_stages` do pipeline selecionado (não mais no JSON).
- Manter cards "Regras da pipeline" (rotting_days, auto_move_days, require_reason_on_lost) por pipeline.
- Regras: não excluir último pipeline ativo; ao excluir pipeline com leads, exigir confirmação e oferecer mover leads para outro pipeline.

**`KanbanPage.tsx`** — evoluir:
- Barra de abas horizontal (scroll horizontal) listando pipelines ativos + botão "+ Novo pipeline" (leva a Configurações).
- Ler `?pipeline=<id>` da URL; default = primeiro ativo por `ordem`.
- Colunas geradas dinamicamente a partir de `pipeline_stages` do pipeline ativo (cor, WIP, labels).
- Drag-and-drop atualiza `leads.stage_id` (e sincroniza `status` via trigger). Só permite mover entre etapas do pipeline ativo.
- Cards mostram apenas leads com `pipeline_id` = ativo.

**Novos hooks**: `usePipelines`, `usePipeline(id)`, `usePipelineStages(pipelineId)`, `useUpdateLeadStage`, `useMovePipelineLeads`.

**Sidebar**: link "Pipelines" continua apontando para `/admin/kanban` (sem mudar rota agora para evitar quebrar bookmarks; podemos renomear depois se você quiser `/admin/pipelines`).

## Plano de implementação (em etapas)

1. **Migração SQL**: criar `pipelines` + `pipeline_stages` + colunas em `leads` + RLS + GRANTs + trigger de sincronização stage↔status + backfill (pipeline "Comercial" por org e mapeamento dos leads).
2. **Hooks e tipos**: `usePipelines`, `usePipelineStages`, `useUpdateLeadStage`, tipos TS.
3. **PipelineSettings**: seletor + modal novo pipeline + CRUD ligado a `pipeline_stages` + arquivar/excluir com regras.
4. **KanbanPage**: abas + colunas dinâmicas + URL param + drag-and-drop no `stage_id`.
5. **Ajustes finos**: Dashboard/LeadsTable continuam com `status` (sem mudança); LeadDetail mostra etapa/pipeline atual.

Depois da sua aprovação eu executo na ordem acima. Confirma?
