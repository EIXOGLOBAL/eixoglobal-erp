import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function exec(sql: string, label: string): Promise<string> {
  try {
    await prisma.$executeRawUnsafe(sql)
    return `+ ${label}`
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    // Ignorar erros de "already exists"
    if (msg.includes('already exists') || msg.includes('duplicate')) {
      return `= ${label} (ja existe)`
    }
    return `! ${label}: ${msg.slice(0, 120)}`
  }
}

async function addColumn(table: string, column: string, type: string, defaultVal?: string) {
  const def = defaultVal !== undefined ? ` DEFAULT ${defaultVal}` : ''
  return exec(
    `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${type}${def}`,
    `${table}.${column}`
  )
}

export async function POST() {
  const log: string[] = []

  try {
    // =========================================================================
    // 1. Criar ENUM types faltantes
    // =========================================================================

    const enumTypes: Array<{ name: string; values: string[] }> = [
      { name: 'BulletinStatus', values: ['DRAFT', 'SUBMITTED', 'ENGINEER_APPROVED', 'MANAGER_APPROVED', 'APPROVED', 'REJECTED'] },
      { name: 'AiAccessLevel', values: ['FULL', 'STANDARD', 'BASIC', 'NONE'] },
      { name: 'SafetyIncidentType', values: ['ACCIDENT', 'NEAR_MISS', 'ENVIRONMENTAL', 'PROPERTY_DAMAGE', 'OTHER'] },
      { name: 'SafetyIncidentSeverity', values: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
      { name: 'NonConformitySeverity', values: ['MINOR', 'MAJOR', 'CRITICAL'] },
      { name: 'NonConformityStatus', values: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] },
    ]

    for (const en of enumTypes) {
      const vals = en.values.map(v => `'${v}'`).join(', ')
      log.push(await exec(
        `DO $$ BEGIN CREATE TYPE "public"."${en.name}" AS ENUM (${vals}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
        `ENUM ${en.name}`
      ))
    }

    // =========================================================================
    // 2. Criar tabelas faltantes
    // =========================================================================

    // safety_incidents
    log.push(await exec(`
      CREATE TABLE IF NOT EXISTS "safety_incidents" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "type" TEXT NOT NULL DEFAULT 'OTHER',
        "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
        "title" TEXT NOT NULL DEFAULT '',
        "description" TEXT,
        "location" TEXT,
        "date" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        "status" TEXT NOT NULL DEFAULT 'OPEN',
        "resolution" TEXT,
        "resolvedAt" TIMESTAMP(3),
        "resolvedById" TEXT,
        "projectId" TEXT,
        "companyId" TEXT NOT NULL,
        "reportedById" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        CONSTRAINT "safety_incidents_pkey" PRIMARY KEY ("id")
      )
    `, 'TABLE safety_incidents'))

    log.push(await exec(`CREATE INDEX IF NOT EXISTS "safety_incidents_projectId_date_idx" ON "safety_incidents"("projectId", "date")`, 'INDEX safety_incidents.projectId_date'))
    log.push(await exec(`CREATE INDEX IF NOT EXISTS "safety_incidents_companyId_type_idx" ON "safety_incidents"("companyId", "type")`, 'INDEX safety_incidents.companyId_type'))

    // quality_non_conformities
    log.push(await exec(`
      CREATE TABLE IF NOT EXISTS "quality_non_conformities" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "title" TEXT NOT NULL DEFAULT '',
        "description" TEXT,
        "severity" TEXT NOT NULL DEFAULT 'MINOR',
        "status" TEXT NOT NULL DEFAULT 'OPEN',
        "location" TEXT,
        "corrective_action" TEXT,
        "preventive_action" TEXT,
        "dueDate" TIMESTAMP(3),
        "resolvedAt" TIMESTAMP(3),
        "projectId" TEXT,
        "companyId" TEXT NOT NULL,
        "reportedById" TEXT,
        "assignedToId" TEXT,
        "checkpointId" TEXT,
        "safetyIncidentId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        CONSTRAINT "quality_non_conformities_pkey" PRIMARY KEY ("id")
      )
    `, 'TABLE quality_non_conformities'))

    log.push(await exec(`CREATE INDEX IF NOT EXISTS "quality_nc_checkpointId_idx" ON "quality_non_conformities"("checkpointId")`, 'INDEX quality_nc.checkpointId'))
    log.push(await exec(`CREATE INDEX IF NOT EXISTS "quality_nc_safetyIncidentId_idx" ON "quality_non_conformities"("safetyIncidentId")`, 'INDEX quality_nc.safetyIncidentId'))

    // system_settings
    log.push(await exec(`
      CREATE TABLE IF NOT EXISTS "system_settings" (
        "key" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "label" TEXT,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        "updatedBy" TEXT,
        CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
      )
    `, 'TABLE system_settings'))

    // system_health_logs (para modulo de monitoramento)
    log.push(await exec(`
      CREATE TABLE IF NOT EXISTS "system_health_logs" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "timestamp" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        "metric" TEXT NOT NULL,
        "value" DOUBLE PRECISION NOT NULL,
        "status" TEXT NOT NULL,
        "details" JSONB,
        "companyId" TEXT,
        CONSTRAINT "system_health_logs_pkey" PRIMARY KEY ("id")
      )
    `, 'TABLE system_health_logs'))

    // =========================================================================
    // 3. Colunas faltantes na tabela users
    // =========================================================================

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

    // =========================================================================
    // 4. Colunas faltantes em audit_logs
    // =========================================================================

    log.push(await addColumn('audit_logs', 'details', 'TEXT'))
    log.push(await addColumn('audit_logs', 'reason', 'TEXT'))
    log.push(await addColumn('audit_logs', 'email', 'TEXT'))
    log.push(await addColumn('audit_logs', 'entityName', 'TEXT'))
    log.push(await addColumn('audit_logs', 'oldData', 'TEXT'))
    log.push(await addColumn('audit_logs', 'newData', 'TEXT'))
    log.push(await addColumn('audit_logs', 'ipAddress', 'TEXT'))
    log.push(await addColumn('audit_logs', 'userAgent', 'TEXT'))

    // =========================================================================
    // 5. Colunas faltantes em outras tabelas
    // =========================================================================

    // logoUrl na companies
    log.push(await addColumn('companies', 'logoUrl', 'TEXT'))

    // Soft-delete columns
    const softDeleteTables = [
      'clients', 'contracts', 'employees', 'equipment',
      'financial_records', 'materials', 'projects', 'purchase_orders', 'suppliers',
    ]
    for (const t of softDeleteTables) {
      log.push(await addColumn(t, 'isDeleted', 'BOOLEAN', 'false'))
      log.push(await addColumn(t, 'deletedAt', 'TIMESTAMP(3)'))
    }

    // =========================================================================
    // 6. Resultado
    // =========================================================================

    const cols = await prisma.$queryRaw<{column_name: string}[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' ORDER BY ordinal_position
    `

    const tables = await prisma.$queryRaw<{tablename: string}[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `

    return NextResponse.json({
      success: true,
      userColumnCount: cols.length,
      tableCount: tables.length,
      log,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: msg, log }, { status: 500 })
  }
}
