# Deploy no EasyPanel - Gestor J2

Este guia considera a versao atual do projeto: frontend Vue em `frontend-vue/`, backend NestJS em `backend/`, Postgres e Redis.

## O Que Mudou

- O frontend React antigo foi removido.
- O `Dockerfile` da raiz agora instala e compila `frontend-vue/`.
- O EasyPanel continua usando o build path `/` para o frontend, porque o `Dockerfile` da raiz ja sabe entrar em `frontend-vue/`.
- O backend continua com build path `/backend`.
- O Nginx do frontend serve os arquivos Vue compilados e encaminha `/api` para o backend usando `BACKEND_UPSTREAM`.

## Servicos Necessarios

1. Postgres.
2. Redis.
3. Backend Gestor J2.
4. Frontend Gestor J2.

## Variaveis Principais

Use `.env.production.example` como base. As principais sao:

```env
FRONTEND_ORIGIN=https://seudominio.com
POSTGRES_DB=gestorj2
POSTGRES_USER=gestorj2
POSTGRES_PASSWORD=troque-por-senha-forte
JWT_SECRET=gere-um-segredo-aleatorio-com-32-caracteres-ou-mais
BACKEND_UPSTREAM=backend:3333
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@seudominio.com
SEED_ON_START=true
SEED_ADMIN_PASSWORD=
SEED_RECOVERY_PASSWORD=
SEED_RESELLER_PASSWORD=
```

Depois do primeiro deploy, altere:

```env
SEED_ON_START=false
```

## Caminho A - Docker Compose

Use quando quiser subir tudo junto.

1. No EasyPanel, crie um projeto.
2. Crie um servico do tipo Compose.
3. Aponte para o `docker-compose.yml` da raiz.
4. Configure as variaveis do `.env.production.example`.
5. Aponte o dominio para o servico `frontend`, porta `80`.
6. Verifique `https://seudominio.com/api/health`.

No Compose, o valor normal de `BACKEND_UPSTREAM` e:

```env
BACKEND_UPSTREAM=backend:3333
```

## Caminho B - Servicos Separados

Use quando preferir bancos gerenciados pelo EasyPanel.

### Backend

- Tipo: App/Dockerfile.
- Build path: `/backend`.
- Porta interna: `3333`.
- Volume recomendado: `/app/storage/uploads`.

Variaveis do backend:

```env
NODE_ENV=production
PORT=3333
FRONTEND_ORIGIN=https://seudominio.com
DATABASE_URL=postgresql://USUARIO:SENHA@HOST_POSTGRES:5432/gestorj2?schema=public
REDIS_HOST=HOST_REDIS
REDIS_PORT=6379
JWT_SECRET=segredo-aleatorio-forte
JWT_EXPIRES_IN=1d
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE=gestorj2
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@seudominio.com
UPLOAD_DIR=storage/uploads
MAX_UPLOAD_MB=10
SEED_ON_START=true
SEED_ADMIN_PASSWORD=
SEED_RECOVERY_PASSWORD=
SEED_RESELLER_PASSWORD=
```

### Frontend

- Tipo: App/Dockerfile.
- Build path: `/`.
- Dockerfile: `Dockerfile` da raiz.
- Build arg: `VITE_API_URL=/api`.
- Porta de dominio: `80`.

Variavel do frontend:

```env
BACKEND_UPSTREAM=NOME_INTERNO_DO_BACKEND:3333
```

Exemplos:

```env
BACKEND_UPSTREAM=backend:3333
BACKEND_UPSTREAM=gestorj2-backend:3333
```

Se `https://seudominio.com/api/health` retornar 502, o problema normalmente e o `BACKEND_UPSTREAM` apontando para nome interno errado.

## Checklist Pos Deploy

- [ ] `https://seudominio.com/api/health` retorna status ok.
- [ ] Login admin funciona.
- [ ] `SEED_ON_START=false` depois do primeiro deploy.
- [ ] Upload de comprovante persiste apos redeploy.
- [ ] Chaves PIX aparecem para revendedores.
- [ ] Evolution API envia mensagens de fila/aprovacao/rejeicao.
- [ ] Web Push pede permissao e recebe notificacao.
- [ ] Backup do Postgres configurado.

## Gerar Chaves VAPID

No computador ou dentro do container backend:

```bash
node -e "console.log(require('web-push').generateVAPIDKeys())"
```

Preencha:

```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@seudominio.com
```

## O Que Nao Precisa Mais Fazer

- Nao configurar React.
- Nao rodar Vite da raiz.
- Nao usar `src/` da raiz.
- Nao copiar `public/` da raiz.
- Nao instalar dependencias na raiz para rodar frontend antigo.
