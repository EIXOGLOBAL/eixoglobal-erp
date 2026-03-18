#!/bin/sh
set -e
echo "Rodando migrações do Prisma..."
npx prisma migrate deploy
echo "Migrações concluídas."
