FROM node:alpine AS base
RUN apk add --no-cache openssl openssl-dev libc6-compat python3 make g++

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# --- Builder ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG GIT_COMMIT_SHA=unknown
ARG APP_VERSION=unknown
ENV GIT_COMMIT_SHA=$GIT_COMMIT_SHA
ENV APP_VERSION=$APP_VERSION
ENV DATABASE_URL="postgresql://fake:fake@localhost:5432/fake"
ENV NEXT_TELEMETRY_DISABLED=1

# Gerar Drizzle schema (se necessário) e Prisma (mantido temporariamente para compatibilidade)
RUN npx prisma generate || true
RUN npx drizzle-kit generate || true
RUN npm run build

# --- Runner ---
FROM node:alpine AS runner
RUN apk add --no-cache openssl libc6-compat postgresql-client
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy all necessary files (sem standalone)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Prisma (mantido temporariamente para compatibilidade)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/lib/generated ./src/lib/generated

# Drizzle ORM
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/src/lib/db ./src/lib/db

# Scripts e outros
COPY --from=builder /app/scripts ./scripts

RUN mkdir -p /app/public/uploads && chown nextjs:nodejs /app/public/uploads

# Startup script: run prisma db push then start server
COPY --from=builder --chown=nextjs:nodejs /app/start.sh ./start.sh

USER nextjs

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "start.sh"]
