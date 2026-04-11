#!/bin/sh
echo "Running Prisma db push to sync schema..."
npx prisma db push --accept-data-loss --skip-generate 2>&1 || echo "Prisma db push failed, continuing with server start..."

if [ -n "$RESET_ADMIN_PASSWORD" ]; then
  echo "Resetting ADMIN passwords..."
  node scripts/reset-admin-password.js || echo "Reset admin password failed"
fi

if [ -n "$RESET_USERS" ]; then
  echo "Resetting ALL users..."
  node scripts/reset-users.js || echo "Reset users failed"
fi

echo "Starting Next.js server..."
exec node server.js
