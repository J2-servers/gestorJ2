#!/bin/sh
set -e

echo "==> Aplicando migrations do banco (prisma migrate deploy)..."
npx prisma migrate deploy

if [ "$SEED_ON_START" = "true" ]; then
  echo "==> Executando seed inicial..."
  npm run prisma:seed || echo "Seed falhou ou jÃ¡ aplicado â€” seguindo."
fi

echo "==> Iniciando backend Gestor J2 na porta ${PORT:-3333}..."
exec node dist/main.js

