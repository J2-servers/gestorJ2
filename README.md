# Gestor J2

Sistema de gestao de recargas para administradores e revendedores.

## Estado Atual

- Frontend: React + Vite.
- Backend: NestJS + TypeScript.
- Banco: PostgreSQL via Prisma.
- Fila/cache: Redis + BullMQ.
- Notificacoes: in-app, SSE, Web Push/PWA e WhatsApp via Evolution API.
- Deploy: Docker/EasyPanel preparado.

## Documentos Importantes

- [CODEX_PROFESSOR.md](CODEX_PROFESSOR.md): estado detalhado das fases implementadas e pendencias.
- [PLANO_DE_ACAO.md](PLANO_DE_ACAO.md): diagnostico, riscos, historico de implementacao e proximos passos.
- [backend/RUNBOOK.md](backend/RUNBOOK.md): como rodar backend, banco, migrations, seed e notificacoes.
- [EASYPANEL.md](EASYPANEL.md): guia de deploy em VPS/EasyPanel.

## Rodar Localmente

1. Subir infraestrutura:

```bash
npm run infra:dev
```

Observacao: Docker Desktop precisa estar ativo.

2. Configurar ambiente:

```bash
copy backend\.env.example backend\.env
```

3. Aplicar migrations:

```bash
npm run backend:prisma:migrate
```

4. Rodar seed:

```powershell
$env:SEED_ADMIN_PASSWORD="senha-admin-local"; $env:SEED_RECOVERY_PASSWORD="senha-recovery-local"; $env:SEED_RESELLER_PASSWORD="senha-revendedor-local"; npm run backend:prisma:seed
```

5. Rodar backend:

```bash
npm run backend:dev
```

6. Rodar frontend:

```bash
npm run dev
```

## Validacoes

```bash
npm run lint
npm run build
npm run build --prefix backend
npx tsc -p backend\tsconfig.build.json --noEmit --incremental false
```

## Proximos Passos

1. Ativar Docker Desktop e aplicar migrations no banco local.
2. Rodar seed local.
3. Testar login real em `/Login`.
4. Migrar telas restantes que ainda usam `appClient/localStorage` para `remoteClient`.
5. Configurar chaves VAPID para push em segundo plano.
6. Configurar Evolution API real.
7. Adicionar testes automatizados para auth, permissoes, pedidos, upload e notificacoes.

