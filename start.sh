#!/bin/sh

echo "=== ERP Startup ==="

# Iniciar servidor em background
echo "[1/2] Starting Next.js server..."
node server.js &
SERVER_PID=$!

# Aguardar servidor estar pronto
echo "[2/2] Waiting for server to be ready..."
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  if wget -q -O /dev/null http://localhost:${PORT:-3001}/api/health/ping 2>/dev/null; then
    echo "[2/2] Server ready!"
    break
  fi
  sleep 2
done

# Executar fix-schema via API (usa PrismaClient que funciona)
echo "[2/2] Running schema fix..."
wget -q -O - --post-data='' http://localhost:${PORT:-3001}/api/admin/fix-schema 2>/dev/null | head -c 200
echo ""

# Reset users se configurado
if [ "$RESET_USERS" = "true" ]; then
  echo "[2/2] Resetting users..."
  wget -q -O - --post-data='' http://localhost:${PORT:-3001}/api/admin/reset-users 2>/dev/null | head -c 200
  echo ""
fi

echo "=== ERP Ready ==="

# Aguardar servidor
wait $SERVER_PID
