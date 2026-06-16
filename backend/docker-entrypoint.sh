#!/bin/sh
set -e

echo "==> Running production preflight..."
node scripts/preflight.cjs

echo "==> Applying database migrations (prisma migrate deploy)..."
npx prisma migrate deploy

if [ "$SEED_ON_START" = "true" ]; then
  echo "==> Running initial seed..."
  npm run prisma:seed || echo "Seed failed or was already applied; continuing."
fi

echo "==> Starting Gestor J2 backend on port ${PORT:-3333}..."
exec node dist/main.js
