# Deploy na VPS com EasyPanel

Guia completo para subir a **Gestor J2** (backend NestJS + frontend React + Postgres + Redis) numa VPS rodando [EasyPanel](https://easypanel.io).

HÃ¡ **dois caminhos**. O **Caminho A (Compose)** Ã© o mais rÃ¡pido. O **Caminho B (serviÃ§os nativos)** dÃ¡ mais controle e usa os bancos gerenciados do EasyPanel.

---

## PrÃ©-requisitos

1. VPS com EasyPanel instalado e um domÃ­nio apontando para o IP (ex.: `app.seudominio.com`).
2. CÃ³digo no GitHub (ou enviado via upload).
3. Gerar os segredos antes:
   ```bash
   # JWT
   openssl rand -hex 32
   # VAPID (push) â€” rode na sua mÃ¡quina com node, ou depois dentro do container
   node -e "console.log(require('web-push').generateVAPIDKeys())"
   ```

---

## Caminho A â€” Docker Compose (recomendado para comeÃ§ar)

1. No EasyPanel, crie um **Project** â†’ **+ Service** â†’ **Compose**.
2. Aponte para o repositÃ³rio (ou cole o conteÃºdo do `docker-compose.yml` da raiz).
3. Em **Environment**, cole as variÃ¡veis baseadas em `.env.production.example`:
   - `POSTGRES_PASSWORD`, `JWT_SECRET` (32+ chars), `FRONTEND_ORIGIN=https://app.seudominio.com`
   - `BACKEND_UPSTREAM=backend:3333` se estiver usando o Compose deste projeto
   - `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
   - No **primeiro deploy**: `SEED_ON_START=true`, `SEED_ADMIN_PASSWORD=...`, `SEED_RECOVERY_PASSWORD=...`, `SEED_RESELLER_PASSWORD=...`
4. Deploy. O backend roda as migrations automaticamente (`prisma migrate deploy`) e, se `SEED_ON_START=true`, cria o admin.
5. No serviÃ§o **frontend**, abra **Domains** e ligue o domÃ­nio `app.seudominio.com` apontando para a **porta 80** do container. Se o EasyPanel mostrar 502 usando `80`, altere o dominio para a porta `8080`; o frontend escuta nas duas portas para evitar erro de proxy. O EasyPanel emite o SSL (Let's Encrypt) automaticamente.
6. **Importante:** depois do primeiro deploy, mude `SEED_ON_START=false` e redeploy.

> O frontend jÃ¡ faz proxy de `/api` para o backend internamente (rede do compose), entÃ£o **nÃ£o hÃ¡ CORS** e o SSE/push funcionam direto.

---

## Caminho B â€” ServiÃ§os nativos do EasyPanel

### 1. Postgres
**+ Service â†’ Postgres**. Anote host interno (geralmente `<project>_postgres`), usuÃ¡rio, senha e database.

### 2. Redis
**+ Service â†’ Redis**. Anote o host interno (ex.: `<project>_redis`).

### 3. Backend (App)
**+ Service â†’ App** â†’ origem GitHub, **Build Path** = `/backend`, **Builder = Dockerfile**.

Environment:
```
NODE_ENV=production
PORT=3333
FRONTEND_ORIGIN=https://app.seudominio.com
DATABASE_URL=postgresql://USUARIO:SENHA@HOST_POSTGRES:5432/DB?schema=public
REDIS_HOST=HOST_REDIS
REDIS_PORT=6379
JWT_SECRET=...(32+ chars, nao use URL)
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE=gestorj2
WHATSAPP_MIN_DELAY_MS=15000
WHATSAPP_MAX_DELAY_MS=75000
WHATSAPP_MIN_SEND_INTERVAL_MS=20000
WHATSAPP_RETRY_BASE_DELAY_MS=120000
WHATSAPP_MAX_PER_MINUTE=3
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@seudominio.com
UPLOAD_DIR=storage/uploads
SEED_ON_START=true          # sÃ³ no 1Âº deploy
SEED_ADMIN_PASSWORD=...
SEED_RECOVERY_PASSWORD=...
SEED_RESELLER_PASSWORD=...
```
- **Mounts/Volumes:** monte um volume em `/app/storage/uploads` (persistir comprovantes).
- **Expose:** porta `3333` (interno). NÃ£o precisa domÃ­nio pÃºblico se o frontend fizer o proxy.

### 4. Frontend (App)
**+ Service â†’ App** â†’ origem GitHub, **Build Path** = `/` (raiz), **Builder = Dockerfile**.
- **Build Args:** `VITE_API_URL=/api`
- **Environment:** `BACKEND_UPSTREAM=NOME_INTERNO_DO_BACKEND:3333` (ex.: `backend:3333` ou `gestorj2_backend:3333`)
- **Domains:** ligue `app.seudominio.com` no servico **frontend**. Use porta `80`; se aparecer 502 no dominio, troque para `8080`. SSL automÃ¡tico.
- O frontend faz proxy de `/api/` para o backend usando `BACKEND_UPSTREAM`. Nao edite o `nginx.conf` para trocar host; troque a variavel no EasyPanel.

---

## PÃ³s-deploy (checklist)

- [ ] `https://app.seudominio.com/api/health` retorna `{ "status": "ok", "database": "connected" }`
- [ ] Login funciona com o admin do seed
- [ ] Instale o PWA no celular (Chrome/Safari â†’ "Adicionar Ã  tela inicial")
- [ ] Ao abrir instalado, o **banner de notificaÃ§Ãµes** aparece â†’ toque em "Ativar notificaÃ§Ãµes"
- [ ] FaÃ§a um pedido de teste â†’ a notificaÃ§Ã£o chega na tela do celular **mesmo bloqueado** âœ…
- [ ] Confirme que `SEED_ON_START=false` apÃ³s o primeiro deploy

## Comandos Ãºteis (console do container no EasyPanel)

```bash
# Gerar chaves VAPID dentro do container backend
node -e "console.log(require('web-push').generateVAPIDKeys())"

# Rodar o seed manualmente
npm run prisma:seed

# Aplicar migrations manualmente
npx prisma migrate deploy

# Inspecionar o banco
npx prisma studio
```

## Notas importantes

- **HTTPS Ã© obrigatÃ³rio** para Service Worker + Web Push. O EasyPanel jÃ¡ entrega SSL via Let's Encrypt.
- **iOS 16.4+**: push sÃ³ funciona com o PWA **instalado** na tela inicial (o banner cuida do fluxo).
- **VAPID**: sem as chaves, o push com tela apagada fica desativado silenciosamente (o SSE em tempo real continua funcionando com a aba aberta).
- **Backups**: configure backup do volume do Postgres no EasyPanel.


