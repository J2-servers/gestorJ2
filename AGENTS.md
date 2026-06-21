# AGENTS.md - Gestor J2

Este arquivo orienta Codex, Claude Code e outros agentes que trabalharem no projeto.

## Estado Oficial

O frontend oficial e Vue 3 + Vite + TypeScript em `frontend-vue/`.

O backend oficial e NestJS + Prisma em `backend/`.

O frontend React antigo foi removido da raiz. Nao recrie `src/`, `index.html`, `vite.config.js`, `public/` ou configs React na raiz.

## Regras De Trabalho

1. Antes de alterar algo, leia `README.md`, `docs/ARQUITETURA_ATUAL.md` e o arquivo do modulo envolvido.
2. Nao invente endpoints. Use os services existentes em `frontend-vue/src/services/api/`.
3. Nao altere schema do banco sem necessidade real e sem migration Prisma.
4. Nao coloque segredos em codigo ou documentacao.
5. Prefira componentes pequenos e modulos isolados.
6. Nao misture regra de negocio dentro de componente visual.
7. Nao recrie dependencias React.
8. Ao mexer em deploy, valide `Dockerfile`, `docker-compose.yml`, `nginx.conf` e `EASYPANEL.md`.

## Organizacao Do Frontend Vue

```text
frontend-vue/src/
├─ app/
├─ router/
├─ layouts/
├─ components/
├─ composables/
├─ modules/
├─ services/api/
├─ stores/
├─ styles/
├─ types/
└─ utils/
```

Cada pagina deve viver dentro de `frontend-vue/src/modules/<modulo>/`.

## Modulos Principais

- `auth`
- `dashboard`
- `credit-requests`
- `chat`
- `servers`
- `users`
- `settings`
- `templates`
- `finance`
- `analytics`
- `whatsapp`
- `maintenance`

## Validacoes Antes De Entregar

```bash
npm run frontend:build
npm run backend:build
npm run verify
```

Se a mudanca for visual, tambem teste manualmente no navegador em desktop e mobile.

## Deploy

O EasyPanel deve usar:

- Frontend: build path `/`, Dockerfile da raiz.
- Backend: build path `/backend`.
- Frontend env: `BACKEND_UPSTREAM=<nome-interno-backend>:3333`.
- Backend env: `FRONTEND_ORIGIN=https://dominio-real`.
