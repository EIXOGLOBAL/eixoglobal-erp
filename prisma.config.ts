import { defineConfig } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
  migrate: {
    // DIRECT_URL aponta para o PostgreSQL direto (sem PgBouncer) para migrations
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
})
