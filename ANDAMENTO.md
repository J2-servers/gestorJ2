# 📋 ANDAMENTO DO PROJETO — Gestor J2

> Documento de status para o time/Codex acompanhar o que já foi feito, como rodar,
> como fazer deploy e o que ainda depende de configuração.
> **Última atualização:** sessão de correções e features (junho/2026).
> **Repositório de deploy:** `https://github.com/J2-servers/gestorJ2` (branch `main`).

---

## 1. Stack e arquitetura

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite + TailwindCSS + Shadcn/ui (pasta `src/`) |
| Backend | NestJS 11 + Prisma ORM (pasta `backend/`) |
| Banco | PostgreSQL |
| Fila | Redis + BullMQ (só para envio de WhatsApp) |
| Auth | JWT (Bearer + cookie httpOnly) — stateless; refresh token no Postgres |
| Push | Web Push (VAPID) + Service Worker (`public/push-worker.js`) |
| Tempo real | SSE (`/api/notifications/stream`) — em memória (1 instância) |
| WhatsApp | Evolution API v2 (fila anti-ban: 3 msg/min, delay 15–75s) |
| Deploy | EasyPanel (4 serviços: `gestor`/frontend, `backend`, `postgres`, `redis`) |

**Modelo de negócio (essencial):** Admin cadastra **servidores**; cada servidor tem vários
**fornecedores** (cada um com login de painel + custo). Revendedores se cadastram nos
servidores (login + preço de venda). O admin vincula cada revendedor a um **fornecedor**
de forma **oculta**. Ao fazer um pedido, o admin vê **qual painel/fornecedor atender**;
o revendedor nunca vê o fornecedor.

**Modelo 2-admins (break-glass):** existe 1 admin operacional + 1 conta de recuperação.
A API **nunca** promove ninguém a admin/recovery (protegido). Seed cria as contas.

---

## 2. O que foi feito (resumo por área)

### Conexão Frontend ↔ Backend
- Migração completa de `appClient` (mock/localStorage) → `remoteClient` (API HTTP real)
  em todas as páginas e componentes. `src/api/entities.js` é uma camada de
  compatibilidade que redireciona entidades legadas para o `remoteClient`.

### Deploy / Infra (EasyPanel)
- nginx do frontend usa o entrypoint padrão + `envsubst` (`${BACKEND_UPSTREAM}`) — não
  depende de entrypoint customizado (que o EasyPanel ignorava → causava 502).
- `backend/docker-entrypoint.sh`: roda `prisma migrate deploy` no boot; acha o `main.js`
  em `dist/` ou `dist/src/`; flag `MIGRATE_RESET_ON_FAILURE`/`FORCE_DB_RESET` (uso único,
  só em banco vazio); resiliente a falha de migração.
- Migration `init` tinha **BOM UTF-8** que quebrava o Postgres → removido. `.gitattributes`
  força `*.sql`/`*.prisma` em LF sem BOM.
- CORS libera `localhost:5173/5174/4173` para dev local apontar no backend implantado.

### Correções de bugs
- **Ortografia/mojibake**: varredura e correção definitiva via reverse CP1252
  (`scripts/fix-mojibake.cjs`) — zero mojibake em todo o sistema (acentos, emojis, etc.).
- **Login exigia refresh**: `AuthContext` não limpava `authError` após login → corrigido.
- **Input perdia foco**: componente `Field` definido dentro do componente (IntegrationsForm)
  → movido para fora.
- **Revendedor órfão** (parentId nulo, criado via tela de login antes do fix):
  - `auth.register` vincula ao admin operacional.
  - `users.list`, `credit-requests.list`, chat e mensagens incluem/atendem órfãos.
  - `credit-requests.create` auto-cura o órfão (grava parentId) + cria notificação do admin.
- **Revendedor não conseguia se cadastrar em servidor** (403): endpoint passou a aceitar
  `reseller`, forçando `resellerId` = próprio id (id forjado é ignorado).
- **Custo do servidor não aparecia** (`normalizeServer` não mapeava `cost_per_credit`) → corrigido.
- **WhatsApp nunca enviava** (causa raiz): o processor lia config da Evolution do `env`
  (vazio em produção) e não das Settings (UI). Agora lê do banco com fallback para env.
- **Import circular** no WhatsApp module (fila injetava `BullQueue_default`) → constante
  movida para `whatsapp.constants.ts`.
- **Redis resiliente**: erros de conexão (NOAUTH, ECONNREFUSED) não derrubam o app;
  `enqueue` não bloqueia a criação de pedido se o Redis cair (timeout 3s).
- **Rede ruim / VPN (1.1.1.1)**: `httpClient` agora usa fetch com timeout (15s) — o app
  abre na tela de login em vez de travar no carregamento.

### Features novas
- **#3 Fornecedores**: model `Supplier` (por servidor), `ResellerServer.supplierId`,
  CRUD admin, UI em AdminServers (gerenciar fornecedores + vincular reseller), e
  `CreditRequest.supplierSnapshot` (snapshot imutável) + resolução ao vivo do fornecedor
  no pedido (admin vê o painel a atender; reseller não).
- **GOD Dashboard** (`/GodDashboard`, menu "Painel GOD"): visão geral (dimensão do
  sistema), usuários (bloquear/ativar/excluir; papéis protegidos), catálogo, operação,
  sistema (fila WhatsApp, migrations, scripts de manutenção, erros) e auditoria.
  Endpoint `GET /api/maintenance/system-overview`.
- **Chat direto admin ↔ revendedor** (`/Chat`, menu "Chat" p/ admin e reseller):
  uma thread por revendedor, **isolamento total** (reseller só vê a própria; id forjado
  é ignorado), notifica o destinatário, atualização ao vivo (polling com aba visível).
  **Botão "Empacotar"**: compacta (gzip) a conversa em `ChatArchive` (permanente) e
  limpa a thread viva, evitando sobrecarga.
- **Liga/desliga WhatsApp**: `Settings.whatsappEnabled`; toggle no Painel GOD → Sistema.
  Off = nada é enfileirado (pedidos e chat seguem normais).
- **PWA**: prompt de **instalação** do app (`InstallAppPrompt`, Android nativo + instruções
  iOS) + pedido de permissão de notificação após instalar. **Auto-update** dos apps
  instalados (nginx serve `index.html` sem cache; SW recarrega quando nova versão assume).
- **Notificações**: in-app (SSE + sino) + Web Push. A notificação de novo pedido inclui
  **nome do revendedor + créditos + valor**. Chat notifica com nome do autor.
  **Chat nunca dispara WhatsApp** — só pedidos disparam.

### Hardening de escala (500 chats + 800 pedidos)
- `chat.threads()` do admin usa `DISTINCT ON` (SQL) — não carrega histórico inteiro.
- Polling do chat só roda com a aba visível (5s conversa / 12s lista).
- Criar pedido não depende de Redis (não trava se a fila cair).

---

## 3. Como rodar LOCALMENTE (Windows, sem Docker)

> O WSL/Docker desta máquina está quebrado; usamos Postgres nativo + cluster isolado.

1. **Postgres local isolado** (porta 5433, auth trust, criado uma vez):
   ```
   "C:\Program Files\PostgreSQL\16\bin\initdb.exe" -D backend\.local\pgdata-dev -U postgres --auth=trust -E UTF8 --locale=C
   "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" -D backend\.local\pgdata-dev -o "-p 5433" -l backend\.local\pg-dev.log start
   "C:\Program Files\PostgreSQL\16\bin\createdb.exe" -U postgres -h 127.0.0.1 -p 5433 gestorj2
   ```
2. **`backend/.env`** (local): `DATABASE_URL=postgresql://postgres@localhost:5433/gestorj2?schema=public`,
   `REDIS_HOST=localhost` (Redis opcional — o app é resiliente sem ele),
   `SEED_ADMIN_PASSWORD/RECOVERY/RESELLER`, `JWT_SECRET`, VAPID.
3. **`.env` (raiz)**: `VITE_API_URL=http://localhost:3333/api`.
4. Migrar + seed: `cd backend && npx prisma migrate deploy && npm run prisma:seed`.
5. Subir backend: `cd backend && npm run dev` (porta 3333).
6. Subir frontend: `npm run dev` (porta 5173/5174).
7. Login local: **j2servers@gmail.com** / (senha do `SEED_ADMIN_PASSWORD`).
   Revendedor demo: **revendedor.demo@gestorj2.local** / `SEED_RESELLER_PASSWORD`.

> Redis nativo não está instalado; sem ele a **fila do WhatsApp** não processa local,
> mas todo o resto funciona (o app é resiliente a Redis ausente).

---

## 4. Deploy em PRODUÇÃO (EasyPanel)

**Serviços:** `postgres`, `redis`, `backend` (App, Build Path `/backend`, Dockerfile),
`gestor`/frontend (App, Build Path `/`, Dockerfile).

**Env do BACKEND (produção — NÃO usar flags de reset com banco populado):**
```
NODE_ENV=production
PORT=3333
FRONTEND_ORIGIN=https://<seu-dominio>
DATABASE_URL=postgresql://gestorj2:<senha>@gestorj2_postgres:5432/gestorj2?schema=public&connection_limit=20&pool_timeout=20
REDIS_HOST=gestorj2_redis
REDIS_PORT=6379
# REDIS_PASSWORD=<so se o Redis tiver senha; se nao tiver, NAO definir>
JWT_SECRET=<32+ chars>
VAPID_PUBLIC_KEY=<par>
VAPID_PRIVATE_KEY=<par>
VAPID_SUBJECT=mailto:admin@seudominio
UPLOAD_DIR=storage/uploads
MAX_UPLOAD_MB=10
SEED_ON_START=false        # true só no 1º deploy
```
**Env do FRONTEND (`gestor`):** apenas `BACKEND_UPSTREAM=gestorj2_backend:3333`.

**Regras de ouro:**
- ⚠️ **NUNCA** deixar `FORCE_DB_RESET` ou `MIGRATE_RESET_ON_FAILURE` ligados com banco populado (apagam dados).
- Migrations são **aditivas** e aplicam automaticamente no boot (`prisma migrate deploy`).
- Como o `nginx.conf` define no-cache do `index.html`, o frontend precisa **rebuildar** (não só restart) ao mudar.
- Para escala: `connection_limit` na DATABASE_URL (acima) + Postgres `max_connections` ~100 + ≥1 vCPU/1GB no backend.

---

## 5. Pendências / depende de configuração (não é bug de código)

- **WhatsApp entregar de fato**: precisa `REDIS` funcionando + **Evolution API configurada**
  (Configurações → Integrações: URL/key/instância) + **conectar o WhatsApp via QR**
  (WA Diagnóstico). O código já lê a config do banco.
- **Push no celular**: só com **HTTPS** (produção) + usuário **instalar o PWA** e
  **autorizar** notificações. iOS exige PWA instalado.
- **VPN 1.1.1.1 (WARP)**: se a tela ficar **branca** (não carrega nada), é o WARP
  bloqueando o domínio `*.easypanel.host` no nível de rede → solução de infra
  (domínio próprio via Cloudflare). O app já trata o caso de "carrega mas API lenta".
- **Escala horizontal futura** (>~1000 simultâneos): múltiplas réplicas do backend +
  **Redis pub/sub** no SSE (hoje o SSE é em memória, 1 instância só).

---

## 6. Histórico de commits desta jornada (mais recente primeiro)

```
2c29458 fix(net): timeout nas requisicoes — app abre mesmo com rede ruim/VPN (1.1.1.1)
cd3a748 feat: liga/desliga WhatsApp + empacotar conversas (zip) + hardening de escala
7f18361 feat: aba de Chat direto admin<->reseller (isolado) + auto-update dos PWAs
110d877 feat: notificacao de pedido com nome do reseller + creditos; chat ao vivo
2a69707 feat: prompt de instalacao do PWA + notificacoes de chat robustas
f2b629e fix(encoding): emojis restantes via reverse CP1252 por linha
27ff669 fix: pedidos de revendedor orfao aparecem p/ admin + notificacoes geradas
354cb25 fix: revendedor consegue se cadastrar no servidor global
bcdd10c feat: GOD Dashboard (painel do sistema) com acesso total categorizado
b5f7ef7 feat(#3): roteamento pedido->fornecedor a prova de falhas + resiliencia de fila
ee073fe feat(#3): admin ve fornecedor no pedido + fix(#5): processor le Evolution do banco
c1c58a3 feat(#3): fornecedores por servidor + vinculo oculto reseller->fornecedor
347c5e7 fix: login-refresh, reseller orfao, encoding CP1252 definitivo, redis resiliente
9206787 chore(cors): permite origens de dev local (vite) no backend
9350d67 fix(reseller-servers): permite admin cadastrar/editar seus proprios vinculos
f1e4dbf fix(ui): corrige mojibake de acentos/emojis e foco perdido em inputs
9cf43e8 feat(redis): support REDIS_PASSWORD/REDIS_USERNAME for BullMQ connection
65153de chore(seed): set admin to j2servers@gmail.com + add FORCE_DB_RESET flag
9e6e847 fix(whatsapp): break circular import (BullQueue_default)
6d329af fix(deploy): locate compiled main.js in dist/ or dist/src/
427d221 fix(db): strip UTF-8 BOM from init migration (P3009)
7792e04 fix(deploy): auto-recover from failed Prisma migration on redeploy
d7a7f7f fix(deploy): nginx /api proxy via stock nginx entrypoint
```

---

## 7. Migrations (todas aditivas, seguras)

```
20260615170000_init
20260615183000_settings_branding_integrations
20260615190000_error_logs
20260615203000_server_price_history
20260615210000_add_recovery_role
20260615213000_branding_gestor_j2
20260616192604_suppliers                          # fornecedores + ResellerServer.supplierId
20260616200003_credit_request_supplier_snapshot   # snapshot do fornecedor no pedido
20260616211633_chat_messages                       # chat direto admin<->reseller
20260616213456_chat_archive_and_whatsapp_toggle    # empacotar chat + Settings.whatsappEnabled
```

---

## 8. Próximos passos sugeridos

1. Redeploy **backend + frontend** em produção (último commit) + setar env (seção 4).
2. Configurar Evolution API + conectar QR; validar WhatsApp.
3. Validar push no celular (PWA instalado + permissão).
4. Aplicar `connection_limit` na DATABASE_URL para suportar pico.
5. (Futuro) Escala horizontal: réplicas + Redis pub/sub no SSE.
