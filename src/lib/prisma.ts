import { PrismaClient } from '@/lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Singleton GLOBAL (dev e prod). Em prod, App Router pode reavaliar o módulo
// em diferentes route bundles, criando multiplos PrismaClient e estourando o
// pool de conexões pg. Pinar no globalThis garante reuso real do client.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL!
  const adapter = new PrismaPg({
    connectionString,
    // Pool generoso para evitar exaustão sob carga concorrente
    max: Number(process.env.PG_POOL_MAX ?? 30),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  } as any)
  return new PrismaClient({ adapter })
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient()
globalForPrisma.prisma = prisma
