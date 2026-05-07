## Sistema de Campanhas Dinâmicas

Transformar o sistema atual em uma plataforma de campanhas gerenciadas pelo admin, com criação de páginas públicas dinâmicas via slug, perguntas customizáveis por campanha e tracking de respostas.

---

### Etapa 1 — Banco de Dados (Supabase)

Criar via migration:

**Tabela `campaigns`**
- `id`, `name`, `slug` (unique), `description`, `type` (enum: diagnostico_score | formulario_captura | pesquisa), `status` (enum: ativa | inativa), `tag`, `public_title`, `public_subtitle`, `image_url`, `optin_fields` (jsonb), `thank_you_message`, `created_at`, `updated_at`

**Tabela `campaign_questions`**
- `id`, `campaign_id` (FK), `question_text`, `question_type` (enum: multiple_choice | checkbox | scale | short_text | long_text | yes_no | dropdown | nps), `options` (jsonb), `scale_min`, `scale_max`, `is_required`, `category`, `sort_order`, `created_at`

**Tabela `campaign_responses`**
- `id`, `lead_id` (FK leads), `campaign_id` (FK), `question_id` (FK), `answer_text`, `answer_value` (numeric), `created_at`

**Alterações em `leads`**
- Adicionar `campaign_id` (uuid, nullable), `campaign_slug` (text, nullable), `campaign_name` (text, nullable)

**RLS**
- `campaigns` / `campaign_questions`: admins gerenciam tudo (`is_admin()`); público pode ler campanhas com `status='ativa'` e suas perguntas
- `campaign_responses`: admins leem tudo; inserção pública permitida (sem auth, pois lead público responde)
- Storage: bucket público `campaign-images` para uploads de logos

**Storage bucket**: `campaign-images` (público), políticas: admins fazem upload, público lê

**Migração de dados**: criar campanha padrão "Diagnóstico Original" e vincular os 55 leads existentes a ela.

---

### Etapa 2 — Painel Admin: módulo Campanhas

**Sidebar** (`AdminSidebar.tsx`): novo item "Campanhas" entre "Editor de Perguntas" e "Base de Conhecimento", com ícone `Megaphone`.

**Rotas novas em `App.tsx`**:
- `/admin/campanhas` → lista
- `/admin/campanhas/nova` → criação
- `/admin/campanhas/:id` → edição

**Página `CampanhasPage.tsx`** (lista):
- Tabela: Nome, Slug, Status (badge), Total de Leads (count), Data de Criação, Ações
- Botão "Nova Campanha" no topo
- Ações por linha: Editar, Duplicar, Ativar/Desativar (toggle inline), Copiar Link (`/c/:slug`), Excluir (com confirmação)

**Página `CampanhaEditPage.tsx`** com 3 abas (`Tabs`):

*Aba Geral*: nome, slug auto-gerado/editável (validação de unicidade), descrição interna, tipo, status toggle, tag.

*Aba Perguntas*:
- Lista drag-and-drop usando `@dnd-kit/core` + `@dnd-kit/sortable` (já comuns no stack)
- "+ Adicionar Pergunta" → modal/inline form
- Cada item: texto, tipo, opções (quando aplicável), escala min/max, obrigatória, categoria, duplicar, excluir
- Editor de opções dinâmico (texto + valor numérico opcional)
- Dropdown "Importar perguntas de outra campanha" (copia tudo, mantém edição)

*Aba Aparência*: título público, subtítulo, upload de imagem (Supabase Storage), checkboxes dos campos de optin (Nome, Email, WhatsApp, Empresa, Porte, Departamento, Cargo), mensagem de agradecimento.

---

### Etapa 3 — Página Pública Dinâmica

**Rota `/c/:slug`** em `App.tsx` → `CampaignPublicPage.tsx`

Comportamento:
1. Buscar campanha pelo slug; se inativa/inexistente → componente `CampaignNotFound` amigável
2. Renderizar título/subtítulo/imagem
3. Renderizar perguntas conforme `type`:
   - `diagnostico_score`: step-by-step (uma por vez), barra de progresso, ao final → optin → resultado com score (somatório de `answer_value` agrupado por categoria)
   - `formulario_captura`: optin primeiro → perguntas opcionais → mensagem
   - `pesquisa`: perguntas → optin → mensagem
4. Componente `QuestionRenderer` por tipo: radio, checkbox group, slider/scale, input, textarea, sim/não, select, NPS visual (0–10 botões)
5. Optin renderiza apenas campos ativos em `optin_fields`, com máscaras de telefone existentes
6. Submissão: cria `lead` (com `campaign_id/slug/name` e `fonte='inbound'`), insere `campaign_responses` em batch, dispara webhook existente, exibe mensagem ou resultado

Visual: mesmo design system (dark, glassmorphism, Space Grotesk, Allevo magenta), mobile-first.

---

### Etapa 4 — Dashboard de Leads

**`LeadsTable.tsx`**: nova coluna "Campanha" exibindo `campaign_name` (fallback: fonte original).

**`DashboardFilters.tsx`**: novo dropdown "Campanha" com lista dinâmica de todas as campanhas + opção "Todas". Combina com filtros existentes (Outbound/Inbound, status, datas, etc).

**`AdminDashboard.tsx`**: aplicar filtro de campanha em `filteredLeads`. Cards de métricas (Total / Hoje / Semana / Mês) recalculam sobre o conjunto filtrado.

**`LeadDetail.tsx`**: nova seção "Campanha de Origem" com nome + link, e bloco "Respostas" listando perguntas + respostas, agrupadas por `category` quando houver.

---

### Etapa 5 — Compatibilidade

- Campos novos em `leads` são nullable → leads antigos continuam funcionando
- Rotas existentes (`/diagnostico`, `/diagnostico-direto`, `/mail`, etc) intocadas
- Editor de Perguntas atual (`question_sets`) continua funcionando paralelamente — ele controla o diagnóstico clássico; campanhas têm suas próprias perguntas

---

### Detalhes técnicos

- Drag-and-drop: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (instalar via bun)
- Slug: gerar com slugify simples (lowercase, sem acentos, hífens), validar unicidade ao salvar
- Score em `diagnostico_score`: somatório de `answer_value` por `category`, normalizado em escala 1–5 para reaproveitar `MaturityGauge` existente
- Webhook: reutilizar `send-webhook` edge function, incluindo `campaign_slug/name/tag` no payload
- RLS de inserção pública em `leads` e `campaign_responses`: criar policy permitindo INSERT anônimo apenas com `campaign_id` válido de campanha ativa (via subquery)
- Realtime opcional para a tabela `leads` no dashboard (já existe padrão no projeto)

---

### Ordem de execução

1. Migration (tabelas, RLS, bucket, campanha padrão + vinculação leads antigos)
2. Sidebar + rotas admin
3. CRUD de campanhas (lista + edição com 3 abas)
4. Rota pública `/c/:slug` + renderer de perguntas + submissão
5. Filtro de campanha no dashboard + coluna na tabela
6. Respostas no LeadDetail
7. QA visual e testes de fluxo end-to-end

Posso começar? Aviso: é uma implementação extensa (muitos arquivos novos e migration grande). Confirme se quer que eu prossiga com tudo de uma vez ou prefere fasear (ex: começar só por Etapas 1–3 e depois 4–6).