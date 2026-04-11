#!/bin/sh

# 1. Fix schema: adicionar colunas faltantes via SQL direto
echo "Fixing database schema..."
node scripts/fix-schema.js || echo "Fix schema failed"

# 2. Prisma db push: sincronizar o resto (novas tabelas, indices, etc)
echo "Running Prisma db push to sync schema..."
npx prisma db push --accept-data-loss --skip-generate 2>&1 || echo "Prisma db push had warnings/errors, continuing..."

# 3. Reset admin password (se configurado)
if [ -n "$RESET_ADMIN_PASSWORD" ]; then
  echo "Resetting ADMIN passwords..."
  node scripts/reset-admin-password.js || echo "Reset admin password failed"
fi

# 4. Reset users (se configurado)
if [ -n "$RESET_USERS" ]; then
  echo "Resetting ALL users..."
  node scripts/reset-users.js || echo "Reset users failed"
fi

echo "Starting Next.js server..."
exec node server.js
