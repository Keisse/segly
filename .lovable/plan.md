## Plano: Seletor de Pipelines + Celebração por Etapa

### 1) Análise da estrutura atual

- **`src/pages/admin/KanbanPage.tsx`**: hoje mostra pipelines como abas horizontais + botão "Novo pipeline" que redireciona para Configurações.
- **`src/components/admin/PipelineSettings.tsx`**: CRUD completo de pipelines/etapas (já é a única fonte de administração). Não bloqueia por papel.
- **`src/hooks/usePipelines.ts`**: hooks de leitura/escrita; `useUpdateLeadStage` atualiza `stage_id` do lead.
- **`src/components/admin/CelebracoesSettings.tsx`**: config global (`confetti`, `sound`, triggers como `deal_won`, `monthly_goal`…). Vamos manter como *preferências globais* (som/confete on/off), mas o **evento de disparo** passa a ser por etapa.
- **`src/hooks/useMyRole.ts`**: já expõe papel do usuário (admin/lider/moderator/user).
- **Tabelas**: `pipelines`, `pipeline_stages` (10 colunas — faltam campos de celebração), `leads` (com `stage_id`, `pipeline_id`). Sem tabela de histórico de celebração por lead.

### 2) Mudanças de banco

Migration única:

- `pipeline_stages`: adicionar
  - `celebrate_enabled boolean NOT NULL DEFAULT false`
  - `celebrate_type text NOT NULL DEFAULT 'confetti'` (por ora só 'confetti')
  - `celebrate_audience text NOT NULL DEFAULT 'owner'` (`owner` | `team` | `admins`)
- Nova tabela `lead_stage_celebrations` (para não repetir a celebração no mesmo par lead+etapa):
  - `lead_id uuid`, `stage_id uuid`, `celebrated_at timestamptz`, PK composta `(lead_id, stage_id)`
  - GRANTs `authenticated` (SELECT/INSERT) + `service_role` (ALL)
  - RLS: usuário só vê/insere celebrações de leads da própria organização (via `my_org()` cruzando com `leads`).
- Policies de escrita em `pipelines` e `pipeline_stages`: restringir `INSERT/UPDATE/DELETE` a `is_admin()`. Manter `SELECT` para toda a organização.

### 3) Frontend — Pipelines page (`KanbanPage.tsx`)

- Substituir o botão **“Novo Pipeline”** por **“Selecionar pipeline ▼”** (Popover ancorado).
- Também substituir as abas horizontais pelo mesmo seletor (fica mais limpo com muitos pipelines). Estado ativo continua vindo de `?pipeline=<id>` e persiste após refresh.
- Popover contém:
  - Lista dos pipelines ativos (com bolinha da cor + nome).
  - Campo de busca visível quando `pipelines.length > 8`.
  - Estado vazio: “Nenhum pipeline disponível”.
  - Se `useMyRole()` = admin: rodapé com link discreto “Gerenciar pipelines →” para `/admin/configuracoes?tab=pipeline`. Para não-admin: sem esse link.
- Ao clicar num item: fecha, seta `?pipeline=id`, carrega Kanban.

### 4) Frontend — Configurações › Pipeline (admin-only)

- Envolver `PipelineSettings` num guard: se `useMyRole()` ≠ `admin`, renderizar bloco “Permissão insuficiente” (mesmo padrão de `AdminOnlyRoute`).
- Na edição de cada etapa (linha do stage no `PipelineSettings`), adicionar seção expansível **“Celebração ao concluir etapa”**:
  - Toggle *Ativar celebração nesta etapa*.
  - Select *Tipo*: “Chuva de confete”.
  - Select *Exibir para*: Responsável / Toda a equipe / Administradores.
- Persistir junto com o batch save existente (adicionar campos em `useUpsertStage`).

### 5) Disparo da celebração (uma vez por lead+etapa)

Criar hook `useCelebrateStageMove(leadId, newStageId)`:

1. Ler `pipeline_stages` (cache): se `celebrate_enabled` = false → nada.
2. Verificar audiência vs. usuário atual (`useMyRole` + `leads.responsavel_id` se existir; se não houver responsável definido, aplicar para todos com acesso).
3. `INSERT` em `lead_stage_celebrations (lead_id, stage_id)` com `ON CONFLICT DO NOTHING` — se conflito (0 rows), NÃO celebrar (já rodou).
4. Se inseriu: disparar confete (`canvas-confetti` já é convenção; se não estiver instalado, adicionar) respeitando `organization_settings.celebrations.confetti/sound` como preferência global.

Integração:
- `useUpdateLeadStage` (hook em `usePipelines.ts`): após sucesso, chamar o disparador. Cobre drag no Kanban.
- `LeadDetail.tsx` (mudança de etapa pela tela de detalhes): reutilizar `useUpdateLeadStage` (já usa? verificar; se não, migrar). Assim ambos os fluxos passam pelo mesmo ponto e garantem uma única fonte de disparo.

Não haverá disparo global por `deal_won`/`monthly_goal` — Celebrações passa a ter só preferências (confete on/off, som on/off, mensagem, ranking). Os toggles antigos de “triggers” serão removidos com nota curta explicando que agora a celebração é definida por etapa (link para Configurações › Pipeline).

### 6) Permissões (resumo aplicado)

| Papel     | Ver pipelines | Selecionar no Popover | Criar/editar/excluir |
|-----------|---------------|-----------------------|----------------------|
| admin     | sim           | sim                   | sim (Config › Pipeline) |
| lider     | sim           | sim                   | não                 |
| user/mod  | sim           | sim                   | não                 |

Rota `/admin/configuracoes` continua acessível, mas a aba Pipeline exibe bloqueio para não-admin.

### 7) Etapas de implementação

1. **Migration**: colunas de celebração em `pipeline_stages`, tabela `lead_stage_celebrations` + policies admin em `pipelines`/`pipeline_stages`.
2. **Hooks**: estender `usePipelines.ts` (tipos + payload de `useUpsertStage`); criar `useCelebrateStage` + gancho no `useUpdateLeadStage`.
3. **PipelineSettings**: campos de celebração por etapa + guard admin.
4. **KanbanPage**: substituir abas/botão por Popover “Selecionar pipeline” com busca condicional e estado vazio.
5. **CelebracoesSettings**: remover triggers globais, manter preferências (confete/som/mensagem/ranking) e mensagem explicativa.
6. **LeadDetail**: garantir que mudança de etapa usa `useUpdateLeadStage`.
7. Verificar build.

Aprovar para eu executar?
