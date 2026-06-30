# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Root (orchestrator)
```bash
npm run frontend:dev          # Vite dev server on :5190
npm run frontend:build        # vue-tsc typecheck + vite build
npm run frontend:typecheck    # vue-tsc --noEmit + tsc --noEmit
npm run backend:dev           # nest start --watch on :3333
npm run backend:build         # nest build
npm run backend:prisma:migrate # prisma migrate dev (creates migration + applies)
npm run backend:prisma:generate # prisma generate (after schema changes)
npm run backend:prisma:seed   # ts-node prisma/seed.ts
npm run infra:dev             # docker compose up -d --build (full stack)
npm run verify                # frontend:build + backend:build (CI gate)
npm run icons                 # generate PWA icons from scripts/generate-icons.cjs
```

### Backend-only (from `backend/`)
```bash
npx prisma studio             # visual DB browser
npx prisma migrate dev --name <name>   # create + apply a new migration
npx prisma migrate reset      # DESTRUCTIVE – wipe DB and re-apply all migrations
```

### Frontend-only (from `frontend-vue/`)
```bash
npm test                      # vitest run --environment jsdom --passWithNoTests
npm run test:watch            # vitest watch
```

## Architecture

### Two-app structure
- `backend/` — NestJS 11, Prisma 6, PostgreSQL, Redis/BullMQ, socket.io, web-push
- `frontend-vue/` — Vue 3, Vite 6, TypeScript, Pinia, Vue Router 4, vee-validate/zod, chart.js

**No React.** The old React frontend (`src/`, root `vite.config.js`, root `public/`) was removed. Do not recreate it.

### Backend layout (`backend/src/`)
```
common/
  config/jwt.config.ts        # getJwtSecret() – validates JWT_SECRET min length
  decorators/                 # @CurrentUser(), @Roles(), @AllowRecovery()
  filters/http-exception.filter.ts  # APP_FILTER – persists 5xx to ErrorLog via Prisma
  guards/recovery-lockdown.guard.ts # APP_GUARD global – blocks `recovery` role everywhere unless @AllowRecovery()
  guards/roles.guard.ts
modules/<name>/
  <name>.module.ts
  <name>.controller.ts
  <name>.service.ts
  dto.ts
```

Every module follows this four-file pattern. DTOs use `class-validator` decorators.

### Auth & roles
- JWT stored in `localStorage` (`gestor_j2_vue_access_token`) and mirrored to a client-readable cookie for the API proxy.
- `RequestUser` type: `{ sub, email, role }` where role is `admin | reseller | dev | recovery`.
- `recovery` role is globally blocked (`RecoveryLockdownGuard`) unless `@AllowRecovery()` decorates the handler.
- `@Roles('admin', 'dev')` controls access; `roles.guard.ts` reads metadata via Reflector.
- Frontend: `useAuthStore` (Pinia) – `auth.isAdmin` is `role === 'admin' || role === 'dev'`.

### Frontend layout (`frontend-vue/src/`)
```
app/App.vue                   # Root – mounts InstallPrompt, bootstraps auth session
router/routes.ts              # All routes; guards check meta.requiresAuth and meta.roles
layouts/AppShell.vue          # Authenticated shell: sidebar (desktop), mobile header + bottom nav
layouts/GuestLayout.vue       # Full-bleed layout for login/register
modules/<domain>/pages/       # Page-level components
modules/<domain>/components/  # Domain-scoped reusables
services/api/                 # One file per resource, all call httpClient
stores/auth.store.ts          # Pinia – user, isAdmin, login/logout/bootstrap
```

New modules go in `modules/<domain>/`. New API calls go in `services/api/<resource>.service.ts`.

### HTTP client (`services/api/httpClient.ts`)
- `httpClient.get/post/patch/delete` – all add `Authorization: Bearer <token>` automatically.
- On 401, attempts a silent `POST /auth/refresh` (cookie-based refresh token) then retries once.
- Backend error envelope: `{ error: { code, message } }` – `ApiError` unwraps this correctly.
- For file uploads use `FormData`; the client skips `Content-Type` so the browser sets the boundary.

### Database (Prisma)
Schema: `backend/prisma/schema.prisma`. Key models:
- `User` – roles: admin/reseller/dev/recovery; `parentId` links reseller → admin.
- `Server`, `PlanModality`, `RechargeCodeProduct` – product catalog.
- `RechargeCodeBatch`, `RechargeCode` – activation code stock (status: available/reserved/sold/voided/cancelled).
- `RechargeCodeOrder`, `RechargeCodePayment` – purchase flow.
- `CreditRequest`, `ApprovalStage` – credit request workflow.
- `Settings` – per-admin config (branding, PIX keys, WhatsApp, integrations).
- `Notification`, `PushSubscription` – in-app + Web Push.
- `WhatsAppLog` – every message sent through Evolution API.
- `AuditLog`, `ErrorLog` – audit trail and persisted 5xx errors for /maintenance.

After any schema change: `npm run backend:prisma:migrate` (creates migration) then `npm run backend:prisma:generate`.

### Redis / BullMQ
- Queue name: `whatsapp` (constant in `whatsapp.constants.ts`).
- `DISABLE_REDIS=true` env disables BullMQ; direct HTTP fallback to Evolution API kicks in.
- Redis connection errors are swallowed globally in `main.ts` – the app stays up if Redis is down.

### Notifications
- **SSE** (`/api/notifications/stream`) – real-time in-browser delivery via `EventSource`.
- **Web Push** – VAPID keys needed; `push-worker.js` service worker in `frontend-vue/public/`.
- **WhatsApp** – Evolution API v2; messages enqueued via BullMQ with throttling config.

### PWA
- Manifest at `frontend-vue/public/manifest.json`, SW at `frontend-vue/public/push-worker.js`.
- `src/lib/pwa.ts` – `isInstalledPWA()`, `enablePush()` (requests permission + registers VAPID subscription).
- `InstallPrompt.vue` – forces install up to 3 times; activates push after install.

### Deploy
```
User → Nginx (:80) → /api → Backend NestJS (:3333)
                   → /*  → frontend-vue/dist (static)
```
`Dockerfile` (root) builds the Vue app and serves it via Nginx. Backend is a separate EasyPanel service. `BACKEND_UPSTREAM` env var in Nginx config names the internal backend host.

### Key env vars
| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_HOST/PORT/PASSWORD` | BullMQ queue |
| `DISABLE_REDIS=true` | Skip BullMQ entirely (direct WhatsApp fallback) |
| `JWT_SECRET` | Must be ≥32 chars random string |
| `FRONTEND_ORIGIN` | Comma-separated CORS origins |
| `EVOLUTION_API_URL/KEY/INSTANCE` | WhatsApp gateway |
| `VAPID_PUBLIC_KEY/PRIVATE_KEY` | Web Push |
| `UPLOAD_DIR` | Where multer stores files (persist as Docker volume) |
| `SEED_ON_START=true` | Seeds DB on first boot only |

## Working rules

1. **No invented endpoints** – verify the module exists in `backend/src/modules/` before calling it. If the endpoint is missing, create it.
2. **Schema changes need migrations** – never mutate the DB schema without a `prisma migrate dev` migration file.
3. **React is dead** – all UI is Vue 3. Never create files in root `src/` or install React packages.
4. **Validate on frontend AND backend** – class-validator DTOs on backend, zod schemas on frontend where needed.
5. **Uploads need a persistent volume** – files written to `UPLOAD_DIR` must survive container restarts; configure the volume in EasyPanel/docker-compose.
6. **AGENTS.md protocol** – when multiple agents work concurrently, mark tasks `[~]` before starting and `[x]` when done, and record decisions in `DECISOES_TECNICAS.md`.
