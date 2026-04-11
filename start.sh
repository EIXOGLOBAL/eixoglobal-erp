#!/bin/sh

echo "=== ERP Startup ==="

# 1. Prisma db push: sincronizar schema com banco
# npx nao funciona no standalone - usar node diretamente
echo "[1/2] Running Prisma db push..."
node ./node_modules/prisma/build/index.js db push --accept-data-loss --skip-generate 2>&1 || echo "[1/2] WARNING: Prisma db push failed"

echo "[2/2] Starting Next.js server..."
exec node server.js
