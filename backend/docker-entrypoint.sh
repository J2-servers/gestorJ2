#!/bin/sh
set -e

echo "==> Running production preflight..."
node scripts/preflight.cjs

echo "==> Applying database migrations (prisma migrate deploy)..."
if npx prisma migrate deploy; then
  echo "Migrations applied."
else
  echo "!! 'prisma migrate deploy' failed (possivelmente migration travada/falha - P3009)."
  if [ "$MIGRATE_RESET_ON_FAILURE" = "true" ]; then
    echo "!! MIGRATE_RESET_ON_FAILURE=true -> resetando o banco (DESTRUTIVO) e reaplicando do zero..."
    npx prisma migrate reset --force --skip-seed --skip-generate
    echo "Banco resetado e migrations reaplicadas com sucesso."
  else
    echo "------------------------------------------------------------------"
    echo "Para auto-recuperar: defina MIGRATE_RESET_ON_FAILURE=true no Ambiente"
    echo "e faca um redeploy. ATENCAO: isso APAGA todos os dados do banco."
    echo "Use somente em banco vazio/novo. Remova a variavel apos o sucesso."
    echo "------------------------------------------------------------------"
    exit 1
  fi
fi

if [ "$SEED_ON_START" = "true" ]; then
  echo "==> Running initial seed..."
  npm run prisma:seed || echo "Seed failed or was already applied; continuing."
fi

echo "==> Starting Gestor J2 backend on port ${PORT:-3333}..."
exec node dist/main.js
