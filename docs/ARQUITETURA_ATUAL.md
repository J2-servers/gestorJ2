# Arquitetura Atual - Gestor J2

## Visao Geral

O Gestor J2 esta organizado em duas aplicacoes principais:

- `frontend-vue/`: interface oficial em Vue 3, Vite e TypeScript.
- `backend/`: API NestJS com Prisma, PostgreSQL, Redis/BullMQ, WhatsApp e notificacoes.

O frontend antigo em React foi removido da raiz. A raiz agora serve como orquestradora de scripts, Docker, docs e infraestrutura.

## Frontend

Pasta: `frontend-vue/`

Responsabilidades:

- Rotas e guardas de autenticacao.
- Layout desktop/mobile.
- Consumo da API real.
- Modulos visuais e operacionais.
- PWA, service worker e notificacoes web.

Estrutura principal:

```text
frontend-vue/src/
├─ app/                 # App raiz
├─ router/              # Rotas e guards
├─ layouts/             # Shell autenticado e layout convidado
├─ components/          # UI, feedback, charts, PWA
├─ composables/         # Hooks Vue reutilizaveis
├─ modules/             # Paginas por dominio
├─ services/api/        # Cliente HTTP e services por recurso
├─ stores/              # Pinia
├─ styles/              # Base visual
├─ types/               # Tipos compartilhados
└─ utils/               # Formatadores e validadores
```

## Backend

Pasta: `backend/`

Responsabilidades:

- Autenticacao e autorizacao.
- Usuarios e revendedores.
- Pedidos de credito.
- Servidores, fornecedores e vinculos.
- Templates de mensagens.
- Configuracoes, branding e PIX.
- Chat.
- Uploads.
- Notificacoes in-app, SSE e Web Push.
- Fila de WhatsApp com Evolution API.
- Importacao CSV, auditoria, manutencao e analytics.

## Banco E Filas

- PostgreSQL guarda dados permanentes.
- Prisma gerencia schema e migrations.
- Redis/BullMQ gerencia filas, especialmente WhatsApp e tarefas assicronas.

## Deploy

O deploy padrao tem:

```text
Usuario -> Frontend Nginx -> /api -> Backend NestJS -> Postgres/Redis
```

O `Dockerfile` da raiz:

1. Instala dependencias de `frontend-vue/`.
2. Gera icones PWA em `frontend-vue/public`.
3. Compila o Vue.
4. Copia `frontend-vue/dist` para Nginx.
5. Usa `nginx.conf` para proxy `/api`.

## Contratos De API

Os endpoints nao devem ser inventados no frontend. Use os services em:

```text
frontend-vue/src/services/api/
```

Quando um endpoint faltar, primeiro confirme no backend em:

```text
backend/src/modules/
```

## Regras Para Novas Implementacoes

- Novo visual entra em Vue, nunca em React.
- Novo modulo entra em `frontend-vue/src/modules/<modulo>`.
- Nova chamada HTTP entra em `frontend-vue/src/services/api`.
- Nova regra persistente de banco precisa de migration Prisma.
- Novos arquivos de upload devem considerar volume persistente em producao.
- Alteracoes de deploy precisam atualizar `EASYPANEL.md`.
