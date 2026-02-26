import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: 'file:./prisma/dev.db',
  },
  migrate: {
    adapter: async () => {
      const { PrismaBetterSqlite3 } = await import('@prisma/adapter-better-sqlite3')
      const dbPath = path.join(__dirname, 'prisma', 'dev.db')
      return new PrismaBetterSqlite3({ url: dbPath })
    },
  },
})
