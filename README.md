# Segly | Sistema de Gestão Para o Corretor de Seguros

Segly é uma plataforma de gestão comercial para organizar leads, acompanhar pipelines, administrar usuários e apoiar a operação comercial de corretores.

## Produção

Aplicação: https://segly.automatizzo.com.br

## Stack

- React + Vite
- TypeScript
- Tailwind + shadcn/ui
- Supabase para banco de dados, autenticação e funções
- GitHub Pages para hospedagem do frontend

## Desenvolvimento local

Você precisa de Node.js e npm.

```sh
git clone <este-repositorio>
cd segly
npm ci
npm run dev
```

Para gerar a build de produção:

```sh
npm run build
```

O deploy em produção é feito automaticamente pelo GitHub Actions quando há push na branch `main`.
