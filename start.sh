#!/bin/sh
echo "Running Prisma db push to sync schema..."
npx prisma db push --accept-data-loss --skip-generate 2>&1 || echo "Prisma db push failed, continuing with server start..."
echo "Starting Next.js server..."
exec node server.js
