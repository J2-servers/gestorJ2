# Runbook Backend - Gestor J2

Este backend e o motor operacional do projeto. Ele deve concentrar regras de negocio, permissoes, validacoes, auditoria, filas, WhatsApp e notificacoes.

## Stack

- NestJS + TypeScript
- PostgreSQL + Prisma
- Redis + BullMQ
- JWT para autenticacao inicial
- Evolution API para WhatsApp
- Web Push para notificacoes desktop/smartphone

## Subir infraestrutura local

Na raiz do projeto:

```bash
npm run infra:dev
```

Isso sobe:

- PostgreSQL em `localhost:5432`
- Redis em `localhost:6379`

## Configurar ambiente

Copie `backend/.env.example` para `backend/.env` e ajuste:

```bash
PORT=3333
FRONTEND_ORIGIN=http://localhost:5174
DATABASE_URL=postgresql://gestorj2:gestorj2@localhost:5432/gestorj2?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=troque-por-um-segredo-longo
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=sua-chave
EVOLUTION_INSTANCE=gestorj2
```

Nunca coloque `.env` no git.

## Banco de dados

Gerar Prisma Client:

```bash
npm run backend:prisma:generate
```

Aplicar migrations:

```bash
npm run backend:prisma:migrate
```

Executar seed local:

```bash
SEED_ADMIN_PASSWORD="senha-admin-local" SEED_RESELLER_PASSWORD="senha-revendedor-local" npm run prisma:seed --prefix backend
```

No PowerShell:

```powershell
$env:SEED_ADMIN_PASSWORD="senha-admin-local"; $env:SEED_RESELLER_PASSWORD="senha-revendedor-local"; npm run prisma:seed --prefix backend
```

Para resetar senhas de usuarios ja existentes no seed local:

```powershell
$env:SEED_RESET_PASSWORDS="true"; $env:SEED_ADMIN_PASSWORD="senha-admin-local"; $env:SEED_RESELLER_PASSWORD="senha-revendedor-local"; npm run prisma:seed --prefix backend
```

Abrir Prisma Studio:

```bash
npm run prisma:studio --prefix backend
```

## Rodar API

```bash
npm run backend:dev
```

Healthcheck:

```bash
curl http://localhost:3333/api/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "service": "gestor-j2-backend",
  "database": "connected",
  "uptime": 123,
  "timestamp": "2026-06-15T00:00:00.000Z"
}
```

## Notificacoes push

Para ativar push desktop/smartphone, gere chaves VAPID e configure:

```bash
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@gestorj2.local
```

O frontend espera:

```bash
VITE_API_URL=http://localhost:3333/api
VITE_VAPID_PUBLIC_KEY=sua-chave-publica
```

Sem `VITE_VAPID_PUBLIC_KEY`, o botao de ativar notificacoes nao aparece.

## Fluxo critico implementado

1. Revendedor cria pedido.
2. Backend valida vinculo com servidor e comprovante quando pre-pago.
3. Backend cria pedido, etapa de aprovacao e auditoria em transacao.
4. Backend cria notificacao interna de entrada na fila.
5. Backend enfileira WhatsApp de entrada na fila.
6. Admin aprova ou rejeita.
7. Backend atualiza status, registra auditoria, notifica e enfileira WhatsApp final.

## Endpoints principais

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/users/me`
- `PATCH /api/users/me`
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `GET /api/servers`
- `GET /api/reseller-servers`
- `POST /api/reseller-servers`
- `PATCH /api/reseller-servers/:id`
- `GET /api/settings`
- `PATCH /api/settings`
- `GET /api/credit-requests`
- `POST /api/credit-requests`
- `PATCH /api/credit-requests/:id/analyzing`
- `PATCH /api/credit-requests/:id/approve`
- `PATCH /api/credit-requests/:id/reject`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `POST /api/notifications/push-subscriptions`
- `POST /api/uploads`
- `GET /api/uploads/:filename`
- `GET /api/invoices`
- `GET /api/audit`

## Gates antes de producao

- `npm run lint`
- `npm run build`
- `npm run build --prefix backend`
- Migration aplicada em ambiente limpo.
- Seed inicial executado.
- CORS restrito ao dominio real.
- `JWT_SECRET` forte.
- Evolution API real configurada.
- VAPID configurado.
- Upload protegido validado.
- Backup PostgreSQL configurado.
- Redis persistente ou estrategia de retry definida.

