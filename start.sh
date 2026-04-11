#!/bin/sh
set -e

echo "=== ERP Startup ==="

# 1. Prisma db push: sincronizar schema com banco
echo "[1/3] Running Prisma db push..."
npx prisma db push --accept-data-loss --skip-generate 2>&1 || {
  echo "WARNING: Prisma db push failed, attempting manual schema fix..."
  psql "$DATABASE_URL" -c '
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" TEXT;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isBlocked" BOOLEAN DEFAULT false;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "blockedAt" TIMESTAMP(3);
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "blockedReason" TEXT;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastAccessAt" TIMESTAMP(3);
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "activeSessionToken" TEXT;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "aiAccessLevel" TEXT;
  ' 2>&1 || echo "Manual schema fix also failed"
}

echo "[1/3] Schema sync done."

# 2. Reset admin password (se configurado)
if [ -n "$RESET_ADMIN_PASSWORD" ]; then
  echo "[2/3] Resetting ADMIN passwords..."
  HASH=$(node -e "require('bcryptjs').hash('123456',10).then(function(h){process.stdout.write(h)})" 2>/dev/null)
  if [ -n "$HASH" ]; then
    psql "$DATABASE_URL" -v "pw=$HASH" -c "UPDATE \"users\" SET password = :'pw' WHERE role = 'ADMIN';"
    echo "Admin passwords reset to 123456"
  else
    echo "WARNING: Could not compute bcrypt hash"
  fi
fi

# 3. Reset users (se configurado)
if [ "$RESET_USERS" = "true" ]; then
  echo "[3/3] Resetting ALL users..."
  HASH=$(node -e "require('bcryptjs').hash('123456',10).then(function(h){process.stdout.write(h)})" 2>/dev/null)

  if [ -n "$HASH" ]; then
    # Usar psql -v para passar o hash sem problemas de escape ($2b$10$...)
    psql "$DATABASE_URL" -v "pw=$HASH" <<'EOSQL'
DELETE FROM "users";

-- Garantir que existe uma empresa
INSERT INTO companies (id, name, cnpj, email, "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'Eixo Global Engenharia', '00000000000000', 'contato@eixoglobal.com.br', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM companies LIMIT 1);

-- Criar admin com hash passado via -v
INSERT INTO "users" (id, username, name, email, password, role, "companyId", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'admin', 'Administrador', 'danilo@eixoglobal.com.br', :'pw', 'ADMIN', id, true, NOW(), NOW()
FROM companies LIMIT 1;
EOSQL

    echo "Admin criado - username: admin, senha: 123456"
  else
    echo "ERROR: Could not compute bcrypt hash, skipping user reset"
  fi
fi

echo "=== Starting Next.js server ==="
exec node server.js
