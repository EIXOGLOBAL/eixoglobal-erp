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
    // 6. Novos ENUMs — segunda onda (11042026-02)
    // =========================================================================

    const newEnums: Array<{ name: string; values: string[] }> = [
      { name: 'HolidayType', values: ['NACIONAL', 'ESTADUAL', 'MUNICIPAL', 'PONTE'] },
      { name: 'BillingStatus', values: ['DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'CANCELLED'] },
      { name: 'ApprovalRequestStatus', values: ['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED'] },
      { name: 'DocumentFileCategory', values: ['DRAWING', 'SPECIFICATION', 'MEMORIAL', 'ART_RRT', 'PERMIT', 'CONTRACT', 'REPORT', 'PHOTO', 'INVOICE', 'CERTIFICATE', 'MANUAL', 'OTHER'] },
    ]

    for (const en of newEnums) {
      const vals = en.values.map(v => `'${v}'`).join(', ')
      log.push(await exec(
        `DO $$ BEGIN CREATE TYPE "public"."${en.name}" AS ENUM (${vals}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
        `ENUM ${en.name}`
      ))
    }

    // =========================================================================
    // 7. Novas colunas em tabelas existentes — segunda onda
    // =========================================================================

    // User: email notification preferences
    log.push(await addColumn('users', 'emailNotifications', 'BOOLEAN', 'true'))
    log.push(await addColumn('users', 'emailDigest', 'BOOLEAN', 'false'))

    // Notification: emailSent flag
    log.push(await addColumn('notifications', 'emailSent', 'BOOLEAN', 'false'))

    // =========================================================================
    // 8. Novas tabelas — segunda onda (11042026-02)
    // =========================================================================

    // work_calendar_holidays
    log.push(await exec(`
      CREATE TABLE IF NOT EXISTS "work_calendar_holidays" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "name" TEXT NOT NULL,
        "date" TIMESTAMP(3) NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'NACIONAL',
        "recurring" BOOLEAN NOT NULL DEFAULT false,
        "calendarId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        CONSTRAINT "work_calendar_holidays_pkey" PRIMARY KEY ("id")
      )
    `, 'TABLE work_calendar_holidays'))

    // bdi_configs
    log.push(await exec(`
      CREATE TABLE IF NOT EXISTS "bdi_configs" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "name" TEXT NOT NULL,
        "companyId" TEXT NOT NULL,
        "percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "administracaoCentral" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "seguroGarantia" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "risco" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "despesasFinanceiras" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "lucro" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "iss" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "pis" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "cofins" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "irpj" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "csll" DECIMAL(5,2) NOT NULL DEFAULT 0,
        "isDefault" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        CONSTRAINT "bdi_configs_pkey" PRIMARY KEY ("id")
      )
    `, 'TABLE bdi_configs'))

    // financial_schedule_items
    log.push(await exec(`
      CREATE TABLE IF NOT EXISTS "financial_schedule_items" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "contractId" TEXT NOT NULL,
        "month" INTEGER NOT NULL,
        "percentage" DECIMAL(5,2) NOT NULL,
        "value" DECIMAL(18,4) NOT NULL,
        "dueDate" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        CONSTRAINT "financial_schedule_items_pkey" PRIMARY KEY ("id")
      )
    `, 'TABLE financial_schedule_items'))

    // composition_versions
    log.push(await exec(`
      CREATE TABLE IF NOT EXISTS "composition_versions" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "compositionId" TEXT NOT NULL,
        "version" INTEGER NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        "createdBy" TEXT NOT NULL,
        CONSTRAINT "composition_versions_pkey" PRIMARY KEY ("id")
      )
    `, 'TABLE composition_versions'))
    log.push(await exec(`CREATE UNIQUE INDEX IF NOT EXISTS "composition_versions_compositionId_version_key" ON "composition_versions"("compositionId", "version")`, 'UNIQUE composition_versions'))

    // task_dependencies
    log.push(await exec(`
      CREATE TABLE IF NOT EXISTS "task_dependencies" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "predecessorId" TEXT NOT NULL,
        "successorId" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'FS',
        "lag" INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id")
      )
    `, 'TABLE task_dependencies'))
    log.push(await exec(`CREATE UNIQUE INDEX IF NOT EXISTS "task_dependencies_predecessorId_successorId_key" ON "task_dependencies"("predecessorId", "successorId")`, 'UNIQUE task_dependencies'))

    // approval_workflows
    log.push(await exec(`
      CREATE TABLE IF NOT EXISTS "approval_workflows" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "companyId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "entityType" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        CONSTRAINT "approval_workflows_pkey" PRIMARY KEY ("id")
      )
    `, 'TABLE approval_workflows'))
    log.push(await exec(`CREATE INDEX IF NOT EXISTS "approval_workflows_companyId_entityType_idx" ON "approval_workflows"("companyId", "entityType")`, 'INDEX approval_workflows'))

    // approval_levels
    log.push(await exec(`
      CREATE TABLE IF NOT EXISTS "approval_levels" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "workflowId" TEXT NOT NULL,
        "level" INTEGER NOT NULL,
        "roleRequired" TEXT,
        "specificUserId" TEXT,
        "minAmount" DOUBLE PRECISION,
        "maxAmount" DOUBLE PRECISION,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        CONSTRAINT "approval_levels_pkey" PRIMARY KEY ("id")
      )
    `, 'TABLE approval_levels'))
    log.push(await exec(`CREATE INDEX IF NOT EXISTS "approval_levels_workflowId_level_idx" ON "approval_levels"("workflowId", "level")`, 'INDEX approval_levels'))

    // approval_requests
    log.push(await exec(`
      CREATE TABLE IF NOT EXISTS "approval_requests" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "companyId" TEXT NOT NULL,
        "entityType" TEXT NOT NULL,
        "entityId" TEXT NOT NULL,
        "currentLevel" INTEGER NOT NULL DEFAULT 1,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "requestedById" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
      )
    `, 'TABLE approval_requests'))
    log.push(await exec(`CREATE INDEX IF NOT EXISTS "approval_requests_companyId_entityType_status_idx" ON "approval_requests"("companyId", "entityType", "status")`, 'INDEX approval_requests_company'))
    log.push(await exec(`CREATE INDEX IF NOT EXISTS "approval_requests_entityType_entityId_idx" ON "approval_requests"("entityType", "entityId")`, 'INDEX approval_requests_entity'))

    // approval_histories
    log.push(await exec(`
      CREATE TABLE IF NOT EXISTS "approval_histories" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "requestId" TEXT NOT NULL,
        "level" INTEGER NOT NULL,
        "action" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "comments" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        CONSTRAINT "approval_histories_pkey" PRIMARY KEY ("id")
      )
    `, 'TABLE approval_histories'))
    log.push(await exec(`CREATE INDEX IF NOT EXISTS "approval_histories_requestId_idx" ON "approval_histories"("requestId")`, 'INDEX approval_histories'))

    // document_folders
    log.push(await exec(`
      CREATE TABLE IF NOT EXISTS "document_folders" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "companyId" TEXT NOT NULL,
        "projectId" TEXT,
        "name" TEXT NOT NULL,
        "parentId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        CONSTRAINT "document_folders_pkey" PRIMARY KEY ("id")
      )
    `, 'TABLE document_folders'))
    log.push(await exec(`CREATE INDEX IF NOT EXISTS "document_folders_companyId_projectId_idx" ON "document_folders"("companyId", "projectId")`, 'INDEX document_folders_company'))
    log.push(await exec(`CREATE INDEX IF NOT EXISTS "document_folders_parentId_idx" ON "document_folders"("parentId")`, 'INDEX document_folders_parent'))

    // document_files
    log.push(await exec(`
      CREATE TABLE IF NOT EXISTS "document_files" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "companyId" TEXT NOT NULL,
        "folderId" TEXT,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "category" TEXT NOT NULL DEFAULT 'OTHER',
        "filePath" TEXT NOT NULL,
        "fileSize" INTEGER NOT NULL,
        "mimeType" TEXT NOT NULL,
        "version" INTEGER NOT NULL DEFAULT 1,
        "uploadedById" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'DRAFT',
        "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        CONSTRAINT "document_files_pkey" PRIMARY KEY ("id")
      )
    `, 'TABLE document_files'))
    log.push(await exec(`CREATE INDEX IF NOT EXISTS "document_files_companyId_category_idx" ON "document_files"("companyId", "category")`, 'INDEX document_files_company'))
    log.push(await exec(`CREATE INDEX IF NOT EXISTS "document_files_folderId_idx" ON "document_files"("folderId")`, 'INDEX document_files_folder'))

    // document_versions
    log.push(await exec(`
      CREATE TABLE IF NOT EXISTS "document_versions" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "documentId" TEXT NOT NULL,
        "version" INTEGER NOT NULL,
        "filePath" TEXT NOT NULL,
        "fileSize" INTEGER NOT NULL,
        "uploadedById" TEXT NOT NULL,
        "changeNotes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
      )
    `, 'TABLE document_versions'))
    log.push(await exec(`CREATE INDEX IF NOT EXISTS "document_versions_documentId_version_idx" ON "document_versions"("documentId", "version")`, 'INDEX document_versions'))

    // billings
    log.push(await exec(`
      CREATE TABLE IF NOT EXISTS "billings" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "number" TEXT NOT NULL,
        "description" TEXT,
        "value" DECIMAL(18,4) NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'DRAFT',
        "dueDate" TIMESTAMP(3) NOT NULL,
        "issuedDate" TIMESTAMP(3),
        "paidDate" TIMESTAMP(3),
        "paidAmount" DECIMAL(18,4),
        "companyId" TEXT NOT NULL,
        "projectId" TEXT,
        "contractId" TEXT,
        "clientId" TEXT,
        "measurementBulletinId" TEXT,
        "createdById" TEXT NOT NULL,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        CONSTRAINT "billings_pkey" PRIMARY KEY ("id")
      )
    `, 'TABLE billings'))
    log.push(await exec(`CREATE INDEX IF NOT EXISTS "billings_companyId_status_idx" ON "billings"("companyId", "status")`, 'INDEX billings_status'))
    log.push(await exec(`CREATE INDEX IF NOT EXISTS "billings_companyId_dueDate_idx" ON "billings"("companyId", "dueDate")`, 'INDEX billings_dueDate'))
    log.push(await exec(`CREATE INDEX IF NOT EXISTS "billings_projectId_idx" ON "billings"("projectId")`, 'INDEX billings_project'))
    log.push(await exec(`CREATE INDEX IF NOT EXISTS "billings_contractId_idx" ON "billings"("contractId")`, 'INDEX billings_contract'))
    log.push(await exec(`CREATE INDEX IF NOT EXISTS "billings_measurementBulletinId_idx" ON "billings"("measurementBulletinId")`, 'INDEX billings_bulletin'))

    // scheduled_reports
    log.push(await exec(`
      CREATE TABLE IF NOT EXISTS "scheduled_reports" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "name" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "frequency" TEXT NOT NULL,
        "dayOfWeek" INTEGER,
        "dayOfMonth" INTEGER,
        "hour" INTEGER NOT NULL DEFAULT 8,
        "recipients" TEXT NOT NULL,
        "filters" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "lastRun" TIMESTAMP(3),
        "nextRun" TIMESTAMP(3),
        "companyId" TEXT NOT NULL,
        "createdById" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        CONSTRAINT "scheduled_reports_pkey" PRIMARY KEY ("id")
      )
    `, 'TABLE scheduled_reports'))
    log.push(await exec(`CREATE INDEX IF NOT EXISTS "scheduled_reports_companyId_idx" ON "scheduled_reports"("companyId")`, 'INDEX scheduled_reports_company'))
    log.push(await exec(`CREATE INDEX IF NOT EXISTS "scheduled_reports_isActive_nextRun_idx" ON "scheduled_reports"("isActive", "nextRun")`, 'INDEX scheduled_reports_active'))

    // =========================================================================
    // 9. Resultado
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
