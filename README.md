# Gestor J2

Sistema de gestao de recargas para administradores e revendedores.

## Estado Atual

- Frontend oficial: Vue 3 + Vite + TypeScript em `frontend-vue/`.
- Backend: NestJS + TypeScript em `backend/`.
- Banco: PostgreSQL via Prisma.
- Fila/cache: Redis + BullMQ.
- Notificacoes: in-app, SSE, Web Push/PWA e WhatsApp via Evolution API.
- Deploy: Docker/EasyPanel com frontend Nginx fazendo proxy de `/api` para o backend.

O frontend React antigo foi removido da raiz. A pasta `src/`, configs React/Vite antigas, `public/`, `dist/` e `node_modules/` da raiz nao fazem mais parte do sistema.

## Estrutura

```text
.
├─ backend/              # API NestJS, Prisma, filas, WhatsApp, notificacoes
├─ frontend-vue/         # Aplicacao Vue oficial
├─ scripts/              # Scripts auxiliares, como geracao de icones PWA
├─ docs/                 # Documentacao atual
├─ Dockerfile            # Build do frontend Vue + Nginx
├─ docker-compose.yml    # Stack completa local/VPS
├─ nginx.conf            # Proxy /api -> backend
└─ EASYPANEL.md          # Guia pratico de deploy
```

## Rodar Localmente

1. Instalar dependencias:

```bash
npm run frontend:install
npm run backend:install
```

2. Subir Postgres, Redis, backend e frontend via Docker Compose:

```bash
npm run infra:dev
```

Ou rode separado para desenvolvimento:

```bash
npm run backend:dev
npm run frontend:dev
```

Frontend local: `http://localhost:5190`.
Backend local: `http://localhost:3333/api/health`.

## Validacao

```bash
npm run frontend:build
npm run backend:build
npm run verify
```

## Documentos

- [EASYPANEL.md](EASYPANEL.md): deploy em VPS/EasyPanel.
- [docs/ARQUITETURA_ATUAL.md](docs/ARQUITETURA_ATUAL.md): arquitetura limpa atual.
- [docs/DEPLOY_EASYPANEL.md](docs/DEPLOY_EASYPANEL.md): checklist operacional de producao.
- [backend/RUNBOOK.md](backend/RUNBOOK.md): operacao do backend.

## Observacoes Importantes

- Nao coloque `.env` real no Git.
- No primeiro deploy use `SEED_ON_START=true`; depois volte para `false`.
- `JWT_SECRET` deve ser segredo aleatorio, nao uma URL.
- Web Push precisa de HTTPS e chaves VAPID.
- Evolution API so envia WhatsApp se `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` e `EVOLUTION_INSTANCE` estiverem configurados.
