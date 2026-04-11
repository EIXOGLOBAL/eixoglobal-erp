import { PrismaClient } from '@/lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Singleton GLOBAL (dev e prod). Em prod, App Router pode reavaliar o módulo
// em diferentes route bundles, criando multiplos PrismaClient e estourando o
// pool de conexões pg. Pinar no globalThis garante reuso real do client.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Modelos com soft-delete (campo isDeleted no schema)
const SOFT_DELETE_MODELS = new Set([
  'Client', 'Contract', 'Employee', 'Equipment',
  'FinancialRecord', 'Material', 'Project', 'PurchaseOrder', 'Supplier',
])

const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL!
  const adapter = new PrismaPg({
    connectionString,
    max: Number(process.env.PG_POOL_MAX ?? 30),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  } as any)

  const base = new PrismaClient({ adapter })

  // Extension simplificada para soft-delete; cast pra PrismaClient pra evitar
  // tipo recursivo absurdamente complexo gerado pelo $extends.
  return base.$extends({
    name: 'soft-delete-filter',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }: any) {
          if (!model || !SOFT_DELETE_MODELS.has(model)) {
            return query(args)
          }

          const a: any = args ?? {}

          // Inject { isDeleted: false } em leituras
          if (['findFirst', 'findFirstOrThrow', 'findMany', 'count', 'aggregate', 'groupBy'].includes(operation)) {
            a.where = a.where ? { AND: [a.where, { isDeleted: false }] } : { isDeleted: false }
            return query(a)
          }

          // findUnique/findUniqueOrThrow: Prisma não aceita isDeleted em where unique,
          // então busca normal e filtra o resultado.
          if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
            const res: any = await query(a)
            if (res && res.isDeleted) {
              if (operation === 'findUniqueOrThrow') {
                throw new Error(`${model} não encontrado`)
              }
              return null
            }
            return res
          }

          // Transformar delete em soft-delete (mantém where unique)
          if (operation === 'delete') {
            const delegate = (base as any)[model.charAt(0).toLowerCase() + model.slice(1)]
            return delegate.update({
              where: a.where,
              data: { isDeleted: true, deletedAt: new Date() },
            })
          }
          if (operation === 'deleteMany') {
            const delegate = (base as any)[model.charAt(0).toLowerCase() + model.slice(1)]
            return delegate.updateMany({
              where: a.where ? { AND: [a.where, { isDeleted: false }] } : { isDeleted: false },
              data: { isDeleted: true, deletedAt: new Date() },
            })
          }

          // updateMany pode receber filtros livres
          if (operation === 'updateMany') {
            a.where = a.where ? { AND: [a.where, { isDeleted: false }] } : { isDeleted: false }
            return query(a)
          }

          // update/upsert usam WhereUniqueInput e não aceitam AND;
          // deixamos passar — se o caller atualizar um registro soft-deletado,
          // ele só afetará um registro invisível. Não há leak de dados.
          return query(args)
        },
      },
    },
  }) as unknown as PrismaClient
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient()
globalForPrisma.prisma = prisma
