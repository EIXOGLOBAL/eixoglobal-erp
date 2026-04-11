import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function addColumn(table: string, column: string, type: string, defaultVal?: string) {
  const def = defaultVal !== undefined ? ` DEFAULT ${defaultVal}` : ''
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${type}${def}`
    )
    return `+ ${table}.${column}`
  } catch {
    return `! ${table}.${column} (already exists or error)`
  }
}

export async function POST() {
  const log: string[] = []

  try {
    // Colunas faltantes na tabela users
    log.push(await addColumn('users', 'username', 'TEXT'))
    log.push(await addColumn('users', 'isActive', 'BOOLEAN', 'true'))
    log.push(await addColumn('users', 'isBlocked', 'BOOLEAN', 'false'))
    log.push(await addColumn('users', 'blockedAt', 'TIMESTAMP(3)'))
    log.push(await addColumn('users', 'blockedReason', 'TEXT'))
    log.push(await addColumn('users', 'lastLoginAt', 'TIMESTAMP(3)'))
    log.push(await addColumn('users', 'lastAccessAt', 'TIMESTAMP(3)'))
    log.push(await addColumn('users', 'activeSessionToken', 'TEXT'))
    log.push(await addColumn('users', 'aiAccessLevel', 'TEXT'))

    // Modulos de permissao
    const modules = [
      'moduleClients', 'moduleSuppliers', 'moduleProjects', 'moduleContracts',
      'moduleFinancial', 'moduleBudgets', 'moduleMeasurements', 'modulePurchases',
      'moduleInventory', 'moduleEquipment', 'moduleRentals', 'moduleEmployees',
      'moduleTimesheet', 'moduleDocuments', 'moduleQuality', 'moduleSafety',
      'moduleDailyReports', 'moduleTraining', 'moduleBilling', 'moduleCostCenters',
    ]
    for (const mod of modules) {
      log.push(await addColumn('users', mod, 'BOOLEAN', 'false'))
    }

    // Username unico
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "users" SET "username" = LOWER(REPLACE("name", ' ', '.')) WHERE "username" IS NULL AND "name" IS NOT NULL`
      )
      log.push('+ Updated null usernames from name')
    } catch { /* ignore */ }

    try {
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username")`
      )
      log.push('+ Created unique index on username')
    } catch {
      log.push('! Username index already exists or duplicates')
    }

    // logoUrl na companies
    log.push(await addColumn('companies', 'logoUrl', 'TEXT'))

    // Soft-delete columns em tabelas que precisam
    const softDeleteTables = [
      'clients', 'contracts', 'employees', 'equipment',
      'financial_records', 'materials', 'projects', 'purchase_orders', 'suppliers',
    ]
    for (const t of softDeleteTables) {
      log.push(await addColumn(t, 'isDeleted', 'BOOLEAN', 'false'))
      log.push(await addColumn(t, 'deletedAt', 'TIMESTAMP(3)'))
    }

    // Contar colunas atuais
    const cols = await prisma.$queryRaw<{column_name: string}[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' ORDER BY ordinal_position
    `

    return NextResponse.json({
      success: true,
      userColumnCount: cols.length,
      userColumns: cols.map(c => c.column_name),
      log,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message, log }, { status: 500 })
  }
}
