import { defineConfig } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
  migrate: {
    async seed(prisma) {
      // Seed logic can be added here later
    },
  },
})
