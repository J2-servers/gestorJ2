# Checklist EasyPanel - Gestor J2

## Resumo

O frontend Vue e publicado pelo `Dockerfile` da raiz.
O backend NestJS e publicado pelo `Dockerfile` dentro de `backend/`.

## Frontend

Configuracao no EasyPanel:

- Tipo: App.
- Build path: `/`.
- Dockerfile: `Dockerfile`.
- Porta: `80`.
- Build arg: `VITE_API_URL=/api`.

Variavel obrigatoria:

```env
BACKEND_UPSTREAM=nome-interno-do-backend:3333
```

Exemplo:

```env
BACKEND_UPSTREAM=gestorj2-backend:3333
```

## Backend

Configuracao no EasyPanel:

- Tipo: App.
- Build path: `/backend`.
- Porta interna: `3333`.
- Volume: `/app/storage/uploads`.

Variaveis minimas:

```env
NODE_ENV=production
PORT=3333
FRONTEND_ORIGIN=https://seudominio.com
DATABASE_URL=postgresql://usuario:senha@host:5432/gestorj2?schema=public
REDIS_HOST=host-redis
REDIS_PORT=6379
JWT_SECRET=segredo-forte
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@seudominio.com
```

## Primeiro Deploy

Use apenas uma vez:

```env
SEED_ON_START=true
SEED_ADMIN_PASSWORD=senha-admin
SEED_RECOVERY_PASSWORD=senha-recovery
SEED_RESELLER_PASSWORD=senha-revendedor
```

Depois do primeiro deploy:

```env
SEED_ON_START=false
```

## Testes Obrigatorios

1. `https://seudominio.com/api/health`.
2. Login admin.
3. Cadastro/login de revendedor.
4. Pedido de credito.
5. Aprovacao/rejeicao.
6. PIX para revendedor.
7. Chat.
8. Upload de comprovante.
9. Push no PWA instalado.
10. WhatsApp via Evolution API.

## Erros Comuns

### 502 no dominio

Verifique:

- O frontend esta usando porta `80`.
- `BACKEND_UPSTREAM` aponta para o nome interno correto do backend.
- O backend esta saudavel na porta `3333`.

### Login falha por CORS

Verifique:

```env
FRONTEND_ORIGIN=https://seudominio.com
```

### Push nao aparece

Verifique:

- HTTPS ativo.
- PWA instalado no celular.
- `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` preenchidas.
- Permissao de notificacao concedida.

### WhatsApp nao envia

Verifique:

- `EVOLUTION_API_URL`.
- `EVOLUTION_API_KEY`.
- `EVOLUTION_INSTANCE`.
- Logs da fila no backend.
