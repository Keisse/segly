
# Reestruturação da Navegação Lateral e Papéis do Segly

Vou reorganizar o menu, criar as novas áreas e implementar o controle de acesso por papel (Usuário, Líder, Administrador) sem alterar estilo visual, cores, tipografia ou comportamento dos itens já existentes.

## 1. Papéis e Permissões (Backend)

Hoje o enum `app_role` só tem `admin`, `moderator`, `user`. Vou:

- Adicionar `lider` ao enum `app_role`.
- Adicionar coluna `lider_id` em `user_roles` (ou tabela `profiles`) para vincular um Usuário a um Líder responsável (só válido quando o papel for `user`; o líder referenciado deve ter papel `lider` ou `admin`).
- Criar/ajustar funções `has_role`, `is_admin`, `is_lider` (SECURITY DEFINER) para uso em RLS.
- Ajustar RLS de `leads` (e futura tabela `clientes`) para:
  - Admin → vê tudo.
  - Líder → vê os próprios + leads de usuários cujo `lider_id` = seu id.
  - Usuário → vê só os próprios (`owner_id = auth.uid()`).
- Se a tabela `leads` ainda não tiver `owner_id`, adiciono a coluna (nullable, sem quebrar dados atuais; admin continua vendo tudo).

## 2. Nova estrutura do menu (`AdminSidebar.tsx`)

Mantendo estilo, ícones no mesmo padrão Lucide, espaçamentos e comportamento colapsável atuais.

**PAINEL**
1. Dashboard — `LayoutDashboard` (existente)
2. Leads — `Users` / `UserSquare` (novo)
3. Pipelines — `KanbanSquare` (existente, renomeado do item Pipelines atual)
4. Clientes — `Handshake` ou `Building2` (novo)
5. Criar campanhas — `Megaphone` (existente)
6. Base de conhecimento — `BookOpen` (existente)
7. Usuários e Permissões — `ShieldCheck` (renomeado de "Usuários", **somente Admin**)

**RODAPÉ** (na mesma área inferior onde hoje está "Nosso Propósito" + "Sair")
1. Nosso Propósito — `PrayingHandsIcon` (existente)
2. Meu Perfil — `UserCircle` (novo, todos)
3. Configurações — `Settings` (novo, **somente Admin**)
4. Sair — `LogOut` (existente)

O filtro de visibilidade usa o hook `useIsAdmin` já existente + um novo `useIsLider`.

## 3. Guarda de rotas

- Criar `AdminOnlyRoute` (wrapper que redireciona não-admins para `/admin/dashboard`).
- Aplicar em `/admin/administradores` (renomeado internamente para "Usuários e Permissões", rota mantida por compatibilidade) e `/admin/configuracoes`.
- Bloqueio server-side já vem das RLS + checagens `is_admin()` nas edge functions relevantes (`manage-admins` já valida).

## 4. Novas páginas

### `/admin/leads` — Lista centralizada de Leads
- Reaproveita `LeadsTable` já existente, agora em página própria.
- Busca por nome/empresa/email, filtros (status, data), ordenação por colunas, clique → `/admin/lead/:id`.
- Query respeita RLS (admin vê tudo, líder vê equipe, usuário vê próprios).

### `/admin/clientes` — Clientes
- Nova tabela `clientes` (ou view sobre `leads` com `status = 'convertido'`). Vou usar tabela nova `clientes` com: `lead_id`, `owner_id`, `pipeline_origem`, `data_conversao`, `status_cliente`, histórico via `cliente_eventos`.
- UI: lista com busca, filtros, detalhes (histórico, pipeline de origem, responsável, data, status).
- Mesmas regras de permissão de Leads.

### `/admin/meu-perfil` — Meu Perfil (todos)
- Formulário para editar nome, email, avatar, preferências (tema, notificações). Grava em `profiles` (crio se não existir).

### `/admin/configuracoes` — Configurações (só Admin)
- Tabs internas:
  - **Geral** — nome da empresa, fuso, logo.
  - **Configurações de Pipeline** — etapas, campos, regras, permissões das pipelines.
  - **Celebrações e Reconhecimento** — regras de gamificação/celebração de vitórias.
  - **Automações** — gatilhos e ações automáticas.
  - **Integrações** — webhooks, chaves externas.
- Nesta primeira entrega as tabs abrem cada seção com estrutura pronta e placeholders "Em breve" para os campos ainda sem escopo detalhado — assim a navegação/permissão fica funcional sem inventar regras não pedidas.

### `/admin/administradores` — Usuários e Permissões
- Página existente renomeada no menu para "Usuários e Permissões".
- Acrescentar seleção de **Papel** (Usuário / Líder / Administrador) e, quando papel = Usuário, campo **Líder responsável** (lista só usuários com papel Líder ou Administrador).
- Ativação/inativação já suportadas via edge function `manage-admins` (estendo o payload).

## 5. Rotas em `App.tsx`

Adicionar (dentro de `/admin`):
- `leads` → `LeadsPage`
- `clientes` → `ClientesPage`
- `meu-perfil` → `MeuPerfilPage`
- `configuracoes` → `ConfiguracoesPage` (envolvida em `AdminOnlyRoute`)
- `administradores` → envolvida em `AdminOnlyRoute`

## 6. Separação clara

- "Pipelines" (menu) → segue apontando para `/admin/kanban` (operacional, oportunidades).
- "Configurações de Pipeline" → aba dentro de `/admin/configuracoes` (administrativa).

## Detalhes técnicos

- Migration única adicionando: valor `lider` no enum, `profiles` (se ausente), `lider_id`, tabela `clientes` + RLS + GRANTs, funções `is_lider`/`can_view_lead`.
- Hook novo `useMyRole()` retornando `'admin' | 'lider' | 'user'`.
- Nenhuma mudança em cores, tokens, tipografia ou no comportamento dos itens já existentes — só adição de itens e reordenação.

## Ordem de execução

1. Migration (papéis, `lider_id`, tabela `clientes`, RLS, GRANTs).
2. Hooks (`useMyRole`, `useIsLider`) e `AdminOnlyRoute`.
3. Sidebar reestruturado com visibilidade por papel.
4. Páginas novas (Leads, Clientes, Meu Perfil, Configurações com tabs).
5. Ajustes em "Usuários e Permissões" (papel + líder responsável).
6. Rotas em `App.tsx`.
7. Verificação: build + Playwright para conferir visibilidade por papel.

Confirma que posso seguir com esta abordagem? Em especial:
- Criar a tabela `clientes` nova (vs. derivar de `leads` convertidos)?
- Deixar as seções de Configurações (Celebrações, Automações, Integrações) com estrutura + placeholder "Em breve" nesta primeira entrega, para não inventar regras?
