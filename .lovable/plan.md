# Plano — Pipelines em abas + separação de permissões

## Objetivo
Na tela `/admin/kanban`:
1. Substituir o seletor atual (popover "Prospecção ⌄") por **abas horizontais**, uma por pipeline existente na organização, acima do quadro.
2. Trocar o botão **"Novo pipeline"** por **"+ Adicionar pipeline"**, que abre uma lista dos pipelines já existentes que ainda não estão nas abas do usuário — a escolha adiciona uma nova aba ao lado das demais. **Não cria pipeline.**
3. A **criação** de pipelines fica restrita a administradores e vive apenas em `Configurações › Pipeline` (já existe). Remover qualquer diálogo de criação desta tela.

## Comportamento das abas
- Abas carregadas dos pipelines da organização (`pipelines` não arquivados).
- Aba ativa reflete `?pipeline=<id>` na URL (mantém deep-link atual).
- Clique numa aba troca o pipeline exibido no Kanban sem recarregar.
- Ao lado da última aba, botão `+ Adicionar pipeline` abre popover com pipelines ainda não abertos como aba na sessão do usuário.

## Permissões
- Botão "Adicionar pipeline": visível para todos os usuários.
- Nenhum caminho de **criação** na página de Pipelines (nem para admin). Admin cria em Configurações.
- Se não houver pipelines disponíveis para adicionar, o popover mostra estado vazio com link para Configurações (apenas admin).

## Persistência das abas visíveis
- Guardar a lista de pipelines "abertos como aba" por usuário em `localStorage` (`segly:pipeline-tabs:<userId>`).
- Default: todos os pipelines da organização aparecem como abas na primeira visita.
- "Adicionar pipeline" acrescenta um id à lista. Fechar aba (x pequeno na aba, exceto na ativa) remove da lista.

## Arquivos a alterar
- `src/pages/admin/KanbanPage.tsx` — trocar seletor por barra de abas + botão adicionar; remover `CreatePipelineDialog` daqui.
- Novo `src/components/admin/PipelineTabs.tsx` — abas + popover "Adicionar".
- `src/components/admin/PipelineSettings.tsx` — permanece como único ponto de criação (já é admin-only via rota Configurações).

## Fora de escopo
- Nenhuma mudança de banco de dados.
- Nenhuma mudança em celebrações, responsáveis, Kanban interno ou hooks.

Aguardo aprovação para implementar.
