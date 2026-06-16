# CODEX — Documento do Professor

> Este arquivo é seu guia de trabalho. Leia inteiro antes de tocar qualquer código.
> Cada seção diz o que está errado, por que está errado e o que você deve fazer.
> Não invente soluções. Não remova funcionalidades. Não duplique código.

---

## STATUS DAS IMPLEMENTAÇÕES (atualizado 2026-06-15)

### ✅ FASE 1 — Schema do Banco (CONCLUÍDA)
- ✅ Enum `ApprovalStatus` criado e `ApprovalStage.status` migrado de String para enum
- ✅ `Server.owner` relação com User adicionada
- ✅ Model `RequestMessage` criado (chat dos pedidos)
- ✅ Model `MessageTemplate` criado (templates WhatsApp)
- ✅ Model `RefreshToken` criado (auth segura)
- ✅ `Invoice.@@index([dueDate])` adicionado
- ✅ `npx prisma generate` executado com sucesso

### ✅ FASE 2 — Backend Crítico (CONCLUÍDA)
- ✅ `InvoicesService` criado com: `list`, `getOne`, `generate`, `markPaid`, `resend`, `markOverdue`
- ✅ `InvoicesController` atualizado: GET /invoices, GET /invoices/:id, POST /invoices, PATCH /invoices/:id/pay, POST /invoices/:id/resend
- ✅ `MessagesModule` criado: GET + POST /credit-requests/:requestId/messages (chat)
- ✅ `TemplatesModule` criado: CRUD de templates WhatsApp (/message-templates)
- ✅ `AnalyticsModule` criado: GET /analytics (dados agregados no backend)
- ✅ `DashboardModule` criado: GET /dashboard/admin e /dashboard/reseller
- ✅ `CreditRequestsService` atualizado: paginação cursor-based, `getOne`, `cancel`, templates nos approve/reject
- ✅ `CreditRequestsController` atualizado: GET :id, PATCH :id/cancel
- ✅ `NotificationsController` atualizado: PATCH /notifications/read-all
- ✅ `WhatsAppController` criado: /whatsapp/status, /qr, /test, /logs, /broadcast
- ✅ `HealthController` atualizado: retorna database status + uptime

### ✅ FASE 3 — Segurança (CONCLUÍDA)
- ✅ `ThrottlerModule` instalado e configurado (5 tentativas/minuto no auth)
- ✅ `@Throttle` decorator nos endpoints de login e register
- ✅ JWT aceita cookie httpOnly (`access_token`) OU Bearer token (backward compat)
- ✅ `RefreshToken` implementado: POST /auth/refresh e POST /auth/logout
- ✅ `cookie-parser` instalado e configurado no main.ts
- ✅ `HttpExceptionFilter` global criado — respostas de erro padronizadas
- ✅ Upload: já tinha `@UseGuards(AuthGuard('jwt'))` no controller (estava seguro)
- ✅ `UpdateMeDto` verificado — só permite `name` e `phone` (estava correto)

### ✅ FASE 4 — Frontend (CONCLUÍDA)
- ✅ `httpClient.js` atualizado: `credentials: 'include'`, auto-refresh de token, retry em 401
- ✅ `remoteClient.js` atualizado com todos os novos endpoints
- ✅ `AuthContext.jsx` migrado para usar `remoteClient` (backend real)
- ✅ `Login.jsx` criado — página de login/cadastro conectada ao backend
- ✅ `App.jsx` atualizado — renderiza Login quando não autenticado (sem loop)
- ✅ `pages.config.js` atualizado — Login adicionado

### ✅ FASE 5 — Qualidade (CONCLUÍDA)
- ✅ Paginação cursor-based em `/credit-requests?cursor=<id>&limit=50`
- ✅ `HttpExceptionFilter` formato padronizado de erros
- ✅ Build backend: `nest build` passa sem erros
- ✅ Build frontend: `vite build` passa sem erros

---

### ✅ FASE 6 — Sistema de Notificações Potência Total (CONCLUÍDA)

**Backend:**
- ✅ `NotificationEventsService` criado — event bus in-memory para SSE (suporta 500 conexões simultâneas)
- ✅ `NotificationsService` atualizado — emite via SSE + Web Push com payload rico
- ✅ Push payload rico: title por tipo, icon, badge, tag, vibrate, requireInteraction, actions
- ✅ Remoção automática de push subscriptions inativas (410/404 do web-push)
- ✅ `GET /notifications/stream` — endpoint SSE com heartbeat a cada 25s
- ✅ `GET /notifications/vapid-public-key` — retorna chave pública para subscribe no frontend
- ✅ `jwt.strategy.ts` atualizado — aceita `?auth=<token>` como query param (necessário para EventSource)

**Frontend:**
- ✅ `public/push-worker.js` reescrito — install/activate/push/notificationclick/pushsubscriptionchange
- ✅ `public/manifest.json` criado — PWA manifest (installable em mobile e desktop)
- ✅ `index.html` atualizado — manifest link, theme-color, apple meta tags
- ✅ `src/hooks/useNotifications.js` criado — SSE com auto-reconexão + fallback polling 30s
- ✅ `src/main.jsx` atualizado — registra service worker no load
- ✅ `NotificationPopover.jsx` reescrito — usa backend real (isRead, createdAt), ícones por tipo
- ✅ `PushNotificationToggle.jsx` reescrito — fluxo completo: permissão → SW → VAPID → subscribe
- ✅ `Layout.jsx` migrado — usa `useAuth()` + `useNotifications()` + `remoteClient.settings`
- ✅ Notificações OS em tempo real (via SSE) quando aba está aberta

### 🔧 REVISÃO FASE 6 — Falhas corrigidas + entrega com tela apagada

Após revisão crítica, estas falhas foram encontradas e corrigidas:

| # | Falha | Correção |
|---|-------|----------|
| 1 | `/vite.svg` não existia → ícones quebrados em manifest/index/push | `scripts/generate-icons.cjs` gera PNGs reais (192, 512, maskable, badge 96, apple-touch). Encoder PNG puro em Node, sem deps |
| 2 | `new Notification()` no hook **trava no Android** (Illegal constructor) | Removido do hook. SSE só atualiza UI; notificação no SO vem 100% do Web Push (SW) |
| 3 | Notificação duplicada (push + SSE simultâneos) | SW checa cliente focado/visível: se houver, repassa via `postMessage`; senão mostra na tela do SO |
| 4 | `getRegistration('/push-worker.js')` argumento errado | Centralizado em `src/lib/pushManager.js` usando `navigator.serviceWorker.ready` |
| 5 | Registro duplo do service worker | `pushManager` registra só se não existir; `main.jsx` registra no load |
| 6 | Sem pedido de permissão pós-instalação | `InstallNotificationPrompt.jsx` — banner que aparece quando instalado (PWA) e push não ativo |

**Arquivos novos da revisão:**
- `scripts/generate-icons.cjs` — gerador de ícones PNG
- `public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `badge-96.png`, `apple-touch-icon.png`
- `src/lib/pushManager.js` — fonte única de verdade do Web Push (enable/disable/state)
- `src/components/layout/InstallNotificationPrompt.jsx` — banner de permissão pós-instalação

**Arquitetura de entrega (importante):**
```
Aba aberta e focada  → SSE atualiza sino/lista in-app (sem notificação do SO, evita duplicar)
Aba em background    → Web Push → SW.showNotification() → aparece na tela
Tela APAGADA / fechado → Web Push (FCM/APNs) → SW → aparece na tela bloqueada  ✅
```
> **Tela apagada SÓ funciona com Web Push (VAPID configurado).** O construtor
> `Notification()` nunca entrega com tela apagada — por isso foi removido.
> O banner pós-instalação chama `enablePush()` a partir de um clique (gesto
> exigido pelo iOS 16.4+, que só suporta push em PWA instalado).

---

## O QUE AINDA PRECISA SER FEITO

### 🔴 CRÍTICO — Requer banco rodando e setup VAPID

**1. Gerar chaves VAPID e configurar no .env**

As chaves VAPID são necessárias para Web Push funcionar. Gere uma vez:
```bash
cd backend
node -e "const wp = require('web-push'); const keys = wp.generateVAPIDKeys(); console.log(JSON.stringify(keys, null, 2));"
```
Copie as chaves geradas para o `.env`:
```env
VAPID_PUBLIC_KEY=BF...  ← chave pública (começa com B)
VAPID_PRIVATE_KEY=...   ← chave privada
VAPID_SUBJECT=mailto:admin@seudominio.com
```
> Sem essas chaves, Web Push (notificações background) fica desabilitado silenciosamente.
> SSE (notificações em tempo real na aba aberta) funciona sem VAPID.

**2. Rodar migration no banco de produção**
```bash
cd backend
npx prisma migrate dev --name "add_enums_messages_templates_refreshtokens"
```
> O banco precisa estar rodando via `docker-compose up -d` primeiro.

**3. Adicionar ícones PNG reais (para notificações mobile)**

Os ícones de notificação precisam estar em:
- `public/icon-192.png` — ícone 192×192 para notificações e PWA
- `public/badge-96.png` — badge 96×96 (ícone pequeno na barra de status Android)

Enquanto não existirem, o service worker usa `/vite.svg` como fallback.
> Em produção, ícones PNG aumentam drasticamente a taxa de instalação PWA e aparência das notificações.

### 🟡 MÉDIO — Melhorias pendentes

**2. ✅ Job de faturas vencidas (cron) — CONCLUÍDO**

- ✅ `@nestjs/schedule` instalado
- ✅ `backend/src/modules/invoices/invoices.cron.ts` criado (`@Cron(EVERY_DAY_AT_9AM)`)
- ✅ `InvoicesCron` adicionado aos providers do `InvoicesModule`
- ✅ `ScheduleModule.forRoot()` adicionado ao `AppModule`

<details><summary>Implementação original de referência</summary>

Criar um job BullMQ com cron para marcar faturas pendentes com `dueDate < now()` como `overdue`.

Arquivo a criar: `backend/src/modules/invoices/invoices.cron.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvoicesService } from './invoices.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class InvoicesCron {
  private readonly logger = new Logger(InvoicesCron.name);

  constructor(private readonly invoices: InvoicesService) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async markOverdueInvoices() {
    const count = await this.invoices.markOverdue();
    this.logger.log(`Faturas vencidas atualizadas: ${count}`);
  }
}
```
Passos:
1. `npm install @nestjs/schedule`
2. Criar o arquivo acima
3. Adicionar `InvoicesCron` ao `InvoicesModule.providers`
4. Adicionar `ScheduleModule.forRoot()` ao `AppModule.imports`

</details>

**3. ✅ Ícones PWA/push — CONCLUÍDO** (ver Fase 6: `scripts/generate-icons.cjs` + PNGs em `public/`)

**4. ✅ Deploy EasyPanel/VPS — CONCLUÍDO** (ver seção "DEPLOY" abaixo)

**5. Logs estruturados (pendente)**

Substituir `console.log/error` por `new Logger(ClassName.name)` do NestJS em:
- `WhatsAppProcessor`
- `CreditRequestsService`
- `InvoicesService`

**4. Pages do frontend ainda usando appClient**

As seguintes páginas ainda usam `appClient` (localStorage mock) para dados.
Devem ser migradas para `remoteClient` para ter dados reais:
- `CreditRequests.jsx` → usar `remoteClient.creditRequests.list()`
- `Dashboard.jsx` → usar `remoteClient.dashboard.admin()` ou `remoteClient.dashboard.reseller()`
- `Analytics.jsx` → usar `remoteClient.analytics.get()`
- `InvoiceManagement.jsx` → usar `remoteClient.invoices.list()`, `remoteClient.invoices.generate()`, etc.
- `MessageTemplates.jsx` → usar `remoteClient.templates.*`
- `BroadcastMessage.jsx` → usar `remoteClient.whatsapp.broadcast()`
- `WhatsAppDiagnostic.jsx` → usar `remoteClient.whatsapp.status()`, `.qrCode()`

**5. Seed do banco**

O seed (`backend/prisma/seed.ts`) precisa ser verificado e completado para ter:
- Admin com settings configuradas
- Resellers pré-pago e pós-pago com telefone
- Servidores vinculados aos resellers
- Pedidos em todos os status (pending, analyzing, recharged, rejected)
- Faturas pendentes e pagas

---

## ESTRUTURA ATUAL DOS MÓDULOS BACKEND

```
backend/src/modules/
├── analytics/           ← NOVO: GET /analytics
│   ├── analytics.controller.ts
│   ├── analytics.module.ts
│   └── analytics.service.ts
├── audit/
│   ├── audit.controller.ts
│   └── audit.module.ts
├── auth/
│   ├── auth.controller.ts  ← ATUALIZADO: cookies, refresh, logout, throttle
│   ├── auth.module.ts
│   ├── auth.service.ts     ← ATUALIZADO: RefreshToken, cookie
│   ├── dto.ts
│   └── jwt.strategy.ts     ← ATUALIZADO: extrai de cookie OU Bearer
├── credit-requests/
│   ├── credit-requests.controller.ts  ← ATUALIZADO: GET :id, PATCH :id/cancel
│   ├── credit-requests.module.ts      ← ATUALIZADO: imports TemplatesModule
│   ├── credit-requests.service.ts     ← ATUALIZADO: getOne, cancel, templates, paginação
│   └── dto.ts
├── dashboard/           ← NOVO: GET /dashboard/admin e /dashboard/reseller
│   ├── dashboard.controller.ts
│   ├── dashboard.module.ts
│   └── dashboard.service.ts
├── health/
│   ├── health.controller.ts  ← ATUALIZADO: retorna db status + uptime
│   └── health.module.ts
├── invoices/
│   ├── invoices.controller.ts  ← ATUALIZADO: CRUD completo
│   ├── invoices.module.ts      ← ATUALIZADO: imports NotificationsModule, WhatsAppModule
│   └── invoices.service.ts     ← NOVO: lógica completa
├── messages/            ← NOVO: chat dos pedidos
│   ├── dto.ts
│   ├── messages.controller.ts
│   ├── messages.module.ts
│   └── messages.service.ts
├── notifications/
│   ├── notifications.controller.ts  ← ATUALIZADO: PATCH read-all
│   ├── notifications.module.ts
│   └── notifications.service.ts     ← ATUALIZADO: markAllRead()
├── prisma/
├── reseller-servers/
├── servers/
├── settings/
├── templates/           ← NOVO: CRUD de templates WhatsApp
│   ├── dto.ts
│   ├── templates.controller.ts
│   ├── templates.module.ts
│   └── templates.service.ts
├── uploads/
├── users/
└── whatsapp/
    ├── whatsapp.controller.ts  ← NOVO: /status, /qr, /test, /logs, /broadcast
    ├── whatsapp.module.ts      ← ATUALIZADO: adiciona controller
    ├── whatsapp.processor.ts
    └── whatsapp.service.ts
```

---

## PADRÕES QUE VOCÊ DEVE SEGUIR

### Resposta de erro padrão (HttpExceptionFilter)
```json
{
  "success": false,
  "error": {
    "code": 400,
    "message": "Campo obrigatório faltando",
    "details": ["campo é obrigatório"]
  },
  "path": "/api/credit-requests",
  "timestamp": "2026-06-15T..."
}
```

### Paginação cursor-based
```typescript
// Request: GET /credit-requests?cursor=<id>&limit=50
// Response:
{ "data": [...], "nextCursor": "clxxxxxxx" | null }
```

### Guard de roles
```typescript
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin', 'dev')
@Post()
create(...) {}
```

### Verificação de escopo
```typescript
if (user.role === 'admin' && reseller.parentId !== user.sub) {
  throw new ForbiddenException('Fora do escopo');
}
```

### Transações compostas
```typescript
return this.prisma.$transaction(async (tx) => {
  const updated = await tx.invoice.update(...);
  await tx.creditRequest.updateMany(...);
  await tx.auditLog.create(...);
  return updated;
});
```

---

## ENDPOINTS DISPONÍVEIS (estado atual)

```
Auth:
  POST /api/auth/login              → { accessToken, user } + cookie refresh_token
  POST /api/auth/register           → { accessToken, user } + cookie refresh_token
  POST /api/auth/refresh            → { accessToken, user } (usa cookie)
  POST /api/auth/logout             → { success: true } (limpa cookie)

Users:
  GET    /api/users/me
  PATCH  /api/users/me
  GET    /api/users                 (admin/dev)
  POST   /api/users                 (admin/dev)
  PATCH  /api/users/:id             (admin/dev)

Servers:
  GET  /api/servers

ResellerServers:
  GET    /api/reseller-servers
  POST   /api/reseller-servers      (admin/dev)
  PATCH  /api/reseller-servers/:id  (admin/dev)

CreditRequests:
  GET    /api/credit-requests?cursor=<id>&limit=50
  GET    /api/credit-requests/:id
  POST   /api/credit-requests       (reseller)
  PATCH  /api/credit-requests/:id/cancel    (reseller)
  PATCH  /api/credit-requests/:id/analyzing (admin/dev)
  PATCH  /api/credit-requests/:id/approve   (admin/dev)
  PATCH  /api/credit-requests/:id/reject    (admin/dev)

Messages (chat):
  GET    /api/credit-requests/:requestId/messages
  POST   /api/credit-requests/:requestId/messages

Notifications:
  GET    /api/notifications
  PATCH  /api/notifications/read-all
  PATCH  /api/notifications/:id/read
  POST   /api/notifications/push-subscriptions

Invoices:
  GET    /api/invoices
  GET    /api/invoices/:id
  POST   /api/invoices              (admin/dev) → body: { resellerId }
  PATCH  /api/invoices/:id/pay      (admin/dev) → body: { proofUrl? }
  POST   /api/invoices/:id/resend   (admin/dev)

Templates:
  GET    /api/message-templates     (admin/dev)
  POST   /api/message-templates     (admin/dev)
  PATCH  /api/message-templates/:id (admin/dev)
  DELETE /api/message-templates/:id (admin/dev)

Analytics:
  GET    /api/analytics             (admin/dev)

Dashboard:
  GET    /api/dashboard/admin
  GET    /api/dashboard/reseller

WhatsApp:
  GET    /api/whatsapp/status       (admin/dev)
  GET    /api/whatsapp/qr           (admin/dev)
  POST   /api/whatsapp/test         (admin/dev) → body: { phone, message }
  GET    /api/whatsapp/logs         (admin/dev) → ?limit=100
  POST   /api/whatsapp/broadcast    (admin/dev) → body: { message, userIds?, targetType? }

Settings:
  GET    /api/settings              (admin/dev)
  PATCH  /api/settings              (admin/dev)

Uploads:
  POST   /api/uploads               → { fileUrl, filename, ... }
  GET    /api/uploads/:filename     (requer autenticação)

Audit:
  GET    /api/audit                 (admin/dev)

Health:
  GET    /api/health                → { status, database, uptime, timestamp }
```

---

## COMO RODAR LOCALMENTE

```bash
# 1. Subir infraestrutura (PostgreSQL + Redis)
cd backend
docker-compose up -d

# 2. Criar .env (se não existir)
cp .env.example .env
# Editar .env com senhas reais se necessário

# 3. Rodar migrations
npx prisma migrate dev

# 4. Gerar seed (opcional)
npm run prisma:seed

# 5. Rodar backend
npm run dev

# 6. Em outro terminal, rodar frontend
cd ..
npm run dev
```

---

## CHECKLIST DE TESTES

Antes de marcar qualquer coisa como done:

| Feature | Como testar |
|---------|-------------|
| Login | POST /api/auth/login com email/senha válidos → 200 com token |
| Login throttle | 6x login com senha errada → 429 Too Many Requests |
| Refresh token | Após login, POST /api/auth/refresh → novo accessToken |
| Logout | POST /api/auth/logout → cookie limpo |
| Gerar fatura | POST /api/invoices { resellerId } com pedidos pendentes → Invoice criada |
| Gerar fatura sem pedidos | POST /api/invoices { resellerId } sem pedidos → 400 |
| Marcar pago | PATCH /api/invoices/:id/pay → status=paid |
| Chat | POST /api/credit-requests/:id/messages → mensagem criada + notificação |
| Template | POST /api/message-templates → criado; aprovar pedido → mensagem usa template |
| Analytics | GET /api/analytics → dados agregados (não lista bruta) |
| Broadcast | POST /api/whatsapp/broadcast → queued: N, skippedNoPhone: M |
| Cancel pedido | PATCH /api/credit-requests/:id/cancel (reseller) → status=canceled |
| Escopo admin | Admin A não vê pedidos/faturas/resellers do Admin B |

---

## MODELO DE 2 ADMINS (segurança / break-glass)

Política implementada (Fase 7):

- **Admin Operacional** (`role = admin`) — faz todas as operações do sistema.
- **Admin de Recuperação** (`role = recovery`) — conta de fallback/segurança. **Só** troca
  o e-mail/senha do admin operacional (e a própria senha). **Não enxerga nada** das operações.
- **Exatamente 2 admins**, criados apenas pelo seed. **Nenhum endpoint cria admin** — nunca.

Como foi garantido:

| Camada | Mecanismo |
|--------|-----------|
| Criação bloqueada | `UsersService.create` força `role = reseller`; `CreateUserDto` nem aceita `role`/`parentId`; `register` sempre cria reseller |
| Seed idempotente | `prisma/seed.ts` faz upsert de 1 admin + 1 recovery por e-mail fixo e **aborta** se achar outro admin/recovery |
| Default-deny global | `RecoveryLockdownGuard` (APP_GUARD) bloqueia a conta `recovery` em TODAS as rotas, exceto as marcadas com `@AllowRecovery()` |
| Allowlist recovery | `GET /users/me`, `POST /auth/logout`, e o controller `/recovery/*` |
| Isolamento mútuo | `UsersService.list` filtra `parentId = adminId` (recovery não aparece); `update` impede admin de editar a conta recovery e vice-versa |
| Auditoria | Reset de credenciais grava `AuditLog` (`recovery.reset_admin_credentials`) e revoga as sessões do admin |

Endpoints novos (`RecoveryModule`):
```
GET   /api/recovery/operational-admin              (recovery) → { id, email, name }
PATCH /api/recovery/operational-admin/credentials  (recovery) → { email?, password? }
PATCH /api/recovery/me/password                    (recovery) → { password }
```

Frontend: ao logar com a conta `recovery`, o `App.jsx` renderiza **apenas** `RecoveryPanel.jsx`
(sem Layout, sem navegação, sem notificações). Variável de seed: `SEED_RECOVERY_PASSWORD`.

> ⚠️ O admin operacional **não** troca o próprio e-mail/senha pela API (o `UpdateMeDto`
> só permite nome/telefone). A troca de credenciais do operacional é feita pela conta de
> recuperação — por design.

---

## CENTRO DE MANUTENÇÃO / AUTO-CURA (página Dev)

Página admin-only (`/DevDiagnostics`, nav "Manutenção") que lê erros e roda scripts de correção seguros (modo diagnóstico → confirmar → auditoria). **Não reescreve código-fonte** — corrige dados/estado/config/schema.

**Backend (`MaintenanceModule`):**
- Novo modelo `ErrorLog` (Prisma) + `HttpExceptionFilter` agora persiste erros 5xx (registrado via `APP_FILTER` no `app.module.ts`, recebe `PrismaService` por DI).
- `repair-scripts/registry.ts` — registro extensível de scripts; cada um com `diagnose()` (read-only) e `apply()` (transacional + `AuditLog`).
- Scripts: destravar pedidos presos, marcar faturas vencidas, reatribuir resellers órfãos, realinhar etapas de aprovação, limpar refs de fatura inexistente, limpar refresh tokens, revogar todas as sessões (high), limpar push antigas, gerar VAPID, arquivar logs WhatsApp, recriar Settings.
- Endpoints (`@Roles('admin','dev')`): `GET /maintenance/overview`, `/errors`, `/scripts`; `POST /scripts/:id/diagnose|apply`; `GET /whatsapp-queue` + `POST /whatsapp-queue/retry`; `GET /migrations` + `POST /migrations/deploy`.
- A conta `recovery` é bloqueada nesses endpoints pelo `RecoveryLockdownGuard` global.

**Frontend:** `src/pages/DevDiagnostics.jsx` (abas: Saúde, Scripts, Erros, Fila, Migrations) via `remoteClient.maintenance.*`.

> Requer migration nova (`ErrorLog`). Gere com `prisma migrate dev` (inclui também o enum `recovery` pendente).

---

## DEPLOY (VPS com EasyPanel)

Todo o necessário para subir está pronto. Guia completo: **[EASYPANEL.md](EASYPANEL.md)**.

Arquivos de deploy criados:
- `docker-compose.yml` (raiz) — stack completa: postgres + redis + backend + frontend
- `backend/Dockerfile` — multi-stage; roda `prisma migrate deploy` automático no start (via `docker-entrypoint.sh`)
- `Dockerfile` (raiz) — frontend buildado e servido por nginx
- `nginx.conf` — proxy `/api` → backend (mesma origem, **sem CORS**) + suporte a **SSE** + SPA fallback
- `.env.production.example` — template de variáveis de produção
- `.dockerignore` (raiz e backend)

Fluxo resumido:
1. EasyPanel → Compose (ou serviços nativos — ver EASYPANEL.md)
2. Definir env: `POSTGRES_PASSWORD`, `JWT_SECRET`, `VAPID_*`, `FRONTEND_ORIGIN`
3. 1º deploy com `SEED_ON_START=true` → cria admin/revendedor; depois voltar para `false`
4. Migrations aplicadas automaticamente no boot do backend
5. Ligar domínio no frontend (porta 80) → EasyPanel emite SSL → HTTPS pronto (exigido pelo push)

> **Tela apagada**: garantida pelo Web Push, que exige HTTPS (EasyPanel entrega) + chaves VAPID no `.env`.

---

**Versão:** 3.0 — 2026-06-15 (notificações + cron + deploy EasyPanel)
