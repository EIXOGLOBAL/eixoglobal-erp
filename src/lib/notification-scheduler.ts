import { prisma } from '@/lib/prisma'
import { notifyUsers } from '@/lib/sse-notifications'
import { toNumber } from '@/lib/formatters'
import { whatsappService } from '@/lib/whatsapp'
import { sendBulkNotificationEmails } from '@/lib/email-sender'

const ONE_HOUR = 60 * 60 * 1000

/**
 * Helper: cria notificacoes no DB, notifica via SSE e dispara emails em background.
 * Centraliza a logica para evitar duplicacao em cada check.
 */
async function createAndNotify(
  userIds: string[],
  companyId: string,
  notifData: { type: string; title: string; message: string; link: string }
) {
  const records = await prisma.notification.createManyAndReturn({
    data: userIds.map(userId => ({
      userId,
      companyId,
      ...notifData,
    })),
  })

  // SSE: notificacao em tempo real
  notifyUsers(userIds, notifData)

  // Email: envio em background (nao bloqueia o scheduler)
  const notificationIds = records.map(r => r.id)
  sendBulkNotificationEmails(userIds, notifData, notificationIds).catch(err => {
    console.error('[Scheduler] Erro ao enviar emails em background:', err)
  })
}

// Anti-duplicate: check if a notification with same type+link was already sent today
async function alreadyNotifiedToday(companyId: string, type: string, link: string): Promise<boolean> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const count = await prisma.notification.count({
    where: {
      companyId,
      type,
      link,
      createdAt: { gte: todayStart },
    },
  })
  return count > 0
}

async function getManagerIds(companyId: string): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { companyId, role: { in: ['ADMIN', 'MANAGER', 'ENGINEER'] }, isActive: true },
    select: { id: true },
  })
  return users.map(u => u.id)
}

async function getAdminIds(companyId: string): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { companyId, role: 'ADMIN', isActive: true },
    select: { id: true },
  })
  return users.map(u => u.id)
}

// Send critical alerts to admins via WhatsApp (uses admin email as phone fallback)
async function sendCriticalWhatsAppAlert(companyId: string, title: string, message: string) {
  if (!whatsappService.isConfigured()) return
  try {
    // Get admin users - WhatsApp number configured in env
    const fromNumber = process.env.WHATSAPP_FROM_NUMBER
    if (!fromNumber) return

    await whatsappService.sendMessage({
      phone: fromNumber,
      message: `⚠️ ALERTA CRÍTICO - ${title}\n\n${message}\n\nAcesse o sistema para mais detalhes.`,
    })
  } catch (error) {
    console.error('[Scheduler] Erro ao enviar WhatsApp:', error)
  }
}

// Send admin-only notification (system alerts that only ADMIN should see)
async function notifyAdminsOnly(companyId: string, type: string, title: string, message: string, link: string, critical: boolean = false) {
  const adminIds = await getAdminIds(companyId)
  if (adminIds.length === 0) return

  const notifData = { type, title, message, link }

  await createAndNotify(adminIds, companyId, notifData)

  // Send WhatsApp for critical alerts
  if (critical) {
    await sendCriticalWhatsAppAlert(companyId, title, message)
  }
}

async function checkExpiringContracts() {
  try {
    const now = new Date()
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Fetch both soon and upcoming contracts in a single query
    const allExpiringContracts = await prisma.contract.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { gte: now, lte: in30Days },
      },
      select: { id: true, identifier: true, companyId: true, endDate: true },
    })

    if (allExpiringContracts.length === 0) return

    // Collect unique companyIds and batch-fetch manager IDs
    const companyIds = [...new Set(allExpiringContracts.map(c => c.companyId))]
    const managersByCompany = new Map<string, string[]>()
    const managers = await prisma.user.findMany({
      where: { companyId: { in: companyIds }, role: { in: ['ADMIN', 'MANAGER', 'ENGINEER'] }, isActive: true },
      select: { id: true, companyId: true },
    })
    for (const m of managers) {
      if (!m.companyId) continue
      const list = managersByCompany.get(m.companyId) || []
      list.push(m.id)
      managersByCompany.set(m.companyId, list)
    }

    // Batch-check already notified today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const contractLinks = allExpiringContracts.map(c => `/contratos/${c.id}`)
    const existingNotifs = await prisma.notification.findMany({
      where: {
        companyId: { in: companyIds },
        type: 'CONTRACT_EXPIRING',
        link: { in: contractLinks },
        createdAt: { gte: todayStart },
      },
      select: { link: true, companyId: true },
    })
    const notifiedSet = new Set(existingNotifs.map(n => `${n.companyId}:${n.link}`))

    for (const contract of allExpiringContracts) {
      const link = `/contratos/${contract.id}`
      if (notifiedSet.has(`${contract.companyId}:${link}`)) continue

      const userIds = managersByCompany.get(contract.companyId) || []
      if (userIds.length === 0) continue

      const isSoon = contract.endDate && contract.endDate <= in7Days
      const notifData = {
        type: 'CONTRACT_EXPIRING',
        title: isSoon ? 'Contrato vencendo em breve' : 'Contrato com vencimento próximo',
        message: `O contrato ${contract.identifier} vence em menos de ${isSoon ? '7' : '30'} dias.`,
        link,
      }

      await createAndNotify(userIds, contract.companyId, notifData)
    }
  } catch (error) {
    console.error('[Scheduler] Erro ao verificar contratos:', error)
  }
}

async function checkLowStockMaterials() {
  try {
    const materials = await prisma.$queryRaw<Array<{
      id: string
      name: string
      code: string
      currentStock: number
      minStock: number
      companyId: string
    }>>`
      SELECT id, name, code, "currentStock", "minStock", "companyId"
      FROM materials
      WHERE "isActive" = 1 AND "currentStock" <= "minStock" AND "minStock" > 0
    `

    for (const mat of materials) {
      const link = '/estoque'
      if (await alreadyNotifiedToday(mat.companyId, 'LOW_STOCK', link + `#${mat.id}`)) continue

      const userIds = await getManagerIds(mat.companyId)
      if (userIds.length === 0) continue

      const notifData = {
        type: 'LOW_STOCK',
        title: 'Estoque baixo',
        message: `Material "${mat.name}" (${mat.code}) está com estoque abaixo do mínimo.`,
        link,
      }

      await createAndNotify(userIds, mat.companyId, notifData)
    }
  } catch (error) {
    console.error('[Scheduler] Erro ao verificar estoque:', error)
  }
}

async function checkOverdueMaintenances() {
  try {
    const now = new Date()

    const overdue = await prisma.equipmentMaintenance.findMany({
      where: {
        scheduledAt: { lt: now },
        completedAt: null,
      },
      select: {
        id: true,
        description: true,
        equipment: {
          select: { id: true, name: true, companyId: true },
        },
      },
      take: 100,
    })

    if (overdue.length === 0) return

    // Batch-fetch manager IDs for all affected companies
    const companyIds = [...new Set(overdue.map(m => m.equipment.companyId))]
    const managersByCompany = new Map<string, string[]>()
    const managers = await prisma.user.findMany({
      where: { companyId: { in: companyIds }, role: { in: ['ADMIN', 'MANAGER', 'ENGINEER'] }, isActive: true },
      select: { id: true, companyId: true },
    })
    for (const mgr of managers) {
      if (!mgr.companyId) continue
      const list = managersByCompany.get(mgr.companyId) || []
      list.push(mgr.id)
      managersByCompany.set(mgr.companyId, list)
    }

    // Batch-check already notified today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const equipLinks = overdue.map(m => `/equipamentos/${m.equipment.id}`)
    const existingNotifs = await prisma.notification.findMany({
      where: {
        companyId: { in: companyIds },
        type: 'EQUIPMENT_MAINTENANCE',
        link: { in: equipLinks },
        createdAt: { gte: todayStart },
      },
      select: { link: true, companyId: true },
    })
    const notifiedSet = new Set(existingNotifs.map(n => `${n.companyId}:${n.link}`))

    for (const m of overdue) {
      const link = `/equipamentos/${m.equipment.id}`
      if (notifiedSet.has(`${m.equipment.companyId}:${link}`)) continue

      const userIds = managersByCompany.get(m.equipment.companyId) || []
      if (userIds.length === 0) continue

      const notifData = {
        type: 'EQUIPMENT_MAINTENANCE',
        title: 'Manutenção atrasada',
        message: `Manutenção "${m.description}" do equipamento ${m.equipment.name} está atrasada.`,
        link,
      }

      await createAndNotify(userIds, m.equipment.companyId, notifData)
    }
  } catch (error) {
    console.error('[Scheduler] Erro ao verificar manutenções:', error)
  }
}

async function checkExpiringSupplierDocuments() {
  try {
    const now = new Date()
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const expiringDocs = await prisma.supplierDocument.findMany({
      where: {
        expiresAt: { gte: now, lte: in30Days },
      },
      select: {
        id: true,
        filename: true,
        expiresAt: true,
        supplier: {
          select: { id: true, name: true, companyId: true },
        },
      },
    })

    if (expiringDocs.length === 0) return

    // Batch-fetch manager IDs for all affected companies
    const companyIds = [...new Set(expiringDocs.map(d => d.supplier.companyId))]
    const managersByCompany = new Map<string, string[]>()
    const managers = await prisma.user.findMany({
      where: { companyId: { in: companyIds }, role: { in: ['ADMIN', 'MANAGER', 'ENGINEER'] }, isActive: true },
      select: { id: true, companyId: true },
    })
    for (const m of managers) {
      if (!m.companyId) continue
      const list = managersByCompany.get(m.companyId) || []
      list.push(m.id)
      managersByCompany.set(m.companyId, list)
    }

    // Batch-check already notified today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const docLinks = expiringDocs.map(d => `/fornecedores/${d.supplier.id}#${d.id}`)
    const existingNotifs = await prisma.notification.findMany({
      where: {
        companyId: { in: companyIds },
        type: 'SUPPLIER_DOC_EXPIRING',
        link: { in: docLinks },
        createdAt: { gte: todayStart },
      },
      select: { link: true, companyId: true },
    })
    const notifiedSet = new Set(existingNotifs.map(n => `${n.companyId}:${n.link}`))

    for (const doc of expiringDocs) {
      const link = `/fornecedores/${doc.supplier.id}#${doc.id}`
      if (notifiedSet.has(`${doc.supplier.companyId}:${link}`)) continue

      const userIds = managersByCompany.get(doc.supplier.companyId) || []
      if (userIds.length === 0) continue

      const daysLeft = Math.ceil((doc.expiresAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      const notifData = {
        type: 'SUPPLIER_DOC_EXPIRING',
        title: 'Documento de fornecedor vencendo',
        message: `Documento "${doc.filename}" do fornecedor ${doc.supplier.name} vence em ${daysLeft} dias.`,
        link: `/fornecedores/${doc.supplier.id}`,
      }

      await createAndNotify(userIds, doc.supplier.companyId, notifData)
    }
  } catch (error) {
    console.error('[Scheduler] Erro ao verificar documentos de fornecedores:', error)
  }
}

async function checkCostCenterBudgetOverruns() {
  try {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    const budgets = await prisma.costCenterBudget.findMany({
      where: { year: currentYear, month: currentMonth },
      include: {
        costCenter: {
          select: { id: true, name: true, code: true, companyId: true },
        },
      },
    })

    for (const budget of budgets) {
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1)
      const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59)

      const result = await prisma.financialRecord.aggregate({
        where: {
          costCenterId: budget.costCenter.id,
          type: 'EXPENSE',
          dueDate: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      })

      const realized = toNumber(result._sum?.amount ?? 0)
      const budgetAmount = toNumber(budget.budgetedAmount)
      if (budgetAmount <= 0) continue

      const percentUsed = (realized / budgetAmount) * 100

      if (percentUsed >= 90) {
        const link = `/financeiro/centros-de-custo`
        if (await alreadyNotifiedToday(budget.costCenter.companyId, 'BUDGET_OVERRUN', link + `#${budget.costCenter.id}`)) continue

        const userIds = await getManagerIds(budget.costCenter.companyId)
        if (userIds.length === 0) continue

        const notifData = {
          type: 'BUDGET_OVERRUN',
          title: percentUsed >= 100 ? 'Orçamento estourado' : 'Orçamento próximo do limite',
          message: `Centro de custo "${budget.costCenter.name}" (${budget.costCenter.code}) utilizou ${percentUsed.toFixed(0)}% do orçamento mensal.`,
          link,
        }

        await createAndNotify(userIds, budget.costCenter.companyId, notifData)
      }
    }
  } catch (error) {
    console.error('[Scheduler] Erro ao verificar orçamentos de centros de custo:', error)
  }
}

// ============================================================================
// MONITORING CHECKS (ADMIN ONLY)
// ============================================================================

async function checkSystemHealth() {
  try {
    // Test database connectivity and response time
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const dbResponseMs = Date.now() - start

    // Get all companies
    const companies = await prisma.company.findMany({ select: { id: true } })

    for (const company of companies) {
      // Log DB response time
      await (prisma as any).systemHealthLog?.create({
        data: {
          metric: 'DB_RESPONSE',
          value: dbResponseMs,
          status: dbResponseMs > 5000 ? 'CRITICAL' : dbResponseMs > 2000 ? 'WARNING' : 'OK',
          details: { responseMs: dbResponseMs },
          companyId: company.id,
        },
      }).catch(() => {})

      // Check for critical DB response
      if (dbResponseMs > 5000) {
        const link = '/configuracoes/monitoramento'
        if (await alreadyNotifiedToday(company.id, 'SYSTEM_ERROR', link + '#db-slow')) continue
        await notifyAdminsOnly(
          company.id,
          'SYSTEM_ERROR',
          'Banco de dados lento',
          `Tempo de resposta do banco: ${dbResponseMs}ms (limite: 5000ms)`,
          link,
          true // CRITICAL -> WhatsApp
        )
      }

      // Log memory usage (Node.js)
      const memUsage = process.memoryUsage()
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
      const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024)
      const heapPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)

      await (prisma as any).systemHealthLog?.create({
        data: {
          metric: 'MEMORY_USAGE',
          value: heapPercent,
          status: heapPercent > 90 ? 'CRITICAL' : heapPercent > 75 ? 'WARNING' : 'OK',
          details: { heapUsedMB, heapTotalMB, heapPercent },
          companyId: company.id,
        },
      }).catch(() => {})

      if (heapPercent > 90) {
        const link = '/configuracoes/monitoramento'
        if (await alreadyNotifiedToday(company.id, 'SYSTEM_ERROR', link + '#memory')) continue
        await notifyAdminsOnly(
          company.id,
          'SYSTEM_ERROR',
          'Uso de memória crítico',
          `Uso de memória heap: ${heapPercent}% (${heapUsedMB}MB / ${heapTotalMB}MB)`,
          link,
          true
        )
      }
    }
  } catch (error) {
    console.error('[Scheduler] Erro ao verificar saúde do sistema:', error)
  }
}

async function checkDataIntegrity() {
  try {
    const companies = await prisma.company.findMany({ select: { id: true } })

    for (const company of companies) {
      const link = '/configuracoes/monitoramento'

      // Check for negative stock
      const negativeStock = await prisma.material.findMany({
        where: {
          companyId: company.id,
          currentStock: { lt: 0 },
        },
        select: { id: true, name: true, currentStock: true },
        take: 5,
      })

      if (negativeStock.length > 0) {
        if (!(await alreadyNotifiedToday(company.id, 'DATA_INCONSISTENCY', link + '#negative-stock'))) {
          const names = negativeStock.map(m => m.name).join(', ')
          await notifyAdminsOnly(
            company.id,
            'DATA_INCONSISTENCY',
            'Estoque negativo detectado',
            `${negativeStock.length} material(is) com estoque negativo: ${names}`,
            link,
            negativeStock.length > 3 // Critical if many
          )
        }
      }

      // Check for orphan time entries (approved by themselves)
      const selfApproved = await prisma.timeEntry.count({
        where: {
          companyId: company.id,
          status: 'APPROVED',
          NOT: { approvedById: null },
        },
      })

      // We need a raw check for self-approval since Prisma doesn't support field comparison
      const selfApprovedEntries = await prisma.$queryRaw<Array<{ cnt: bigint }>>`
        SELECT COUNT(*) as cnt FROM time_entries
        WHERE "companyId" = ${company.id}
        AND status = 'APPROVED'
        AND "approvedById" = "employeeId"
        AND "approvedById" IS NOT NULL
      `.catch(() => [{ cnt: BigInt(0) }])

      const selfApprovalCount = Number(selfApprovedEntries[0]?.cnt || 0)
      if (selfApprovalCount > 0) {
        if (!(await alreadyNotifiedToday(company.id, 'DATA_INCONSISTENCY', link + '#self-approval'))) {
          await notifyAdminsOnly(
            company.id,
            'DATA_INCONSISTENCY',
            'Auto-aprovação detectada',
            `${selfApprovalCount} ponto(s) foram aprovados pelo próprio funcionário`,
            link,
            selfApprovalCount > 5
          )
        }
      }
    }
  } catch (error) {
    console.error('[Scheduler] Erro ao verificar integridade de dados:', error)
  }
}

async function checkAnomalousActivity() {
  try {
    const companies = await prisma.company.findMany({ select: { id: true } })
    const last1h = new Date(Date.now() - ONE_HOUR)

    for (const company of companies) {
      const link = '/configuracoes/monitoramento'

      // Check for excessive deletions in the last hour
      const recentDeletions = await prisma.auditLog.count({
        where: {
          companyId: company.id,
          action: 'DELETE',
          createdAt: { gte: last1h },
        },
      })

      if (recentDeletions > 20) {
        if (!(await alreadyNotifiedToday(company.id, 'UNUSUAL_ACTIVITY', link + '#deletions'))) {
          await notifyAdminsOnly(
            company.id,
            'UNUSUAL_ACTIVITY',
            'Atividade incomum: muitas exclusões',
            `${recentDeletions} exclusões foram realizadas na última hora`,
            link,
            recentDeletions > 50
          )
        }
      }

      // Check for off-hours activity (before 5am or after 11pm)
      const now = new Date()
      const currentHour = now.getHours()
      if (currentHour < 5 || currentHour > 23) {
        const offHoursActions = await prisma.auditLog.count({
          where: {
            companyId: company.id,
            createdAt: { gte: last1h },
          },
        })

        if (offHoursActions > 10) {
          if (!(await alreadyNotifiedToday(company.id, 'UNUSUAL_ACTIVITY', link + '#off-hours'))) {
            await notifyAdminsOnly(
              company.id,
              'UNUSUAL_ACTIVITY',
              'Atividade fora do horário',
              `${offHoursActions} ações realizadas fora do horário comercial (${currentHour}h)`,
              link,
              false
            )
          }
        }
      }
    }
  } catch (error) {
    console.error('[Scheduler] Erro ao verificar atividade anômala:', error)
  }
}

// ============================================================================
// RUN ALL CHECKS
// ============================================================================

async function runChecks() {
  console.log('[Scheduler] Executando verificações de notificações...')

  // Standard checks (notify managers)
  await checkExpiringContracts()
  await checkLowStockMaterials()
  await checkOverdueMaintenances()
  await checkExpiringSupplierDocuments()
  await checkCostCenterBudgetOverruns()

  // Monitoring checks (notify admins only)
  await checkSystemHealth()
  await checkDataIntegrity()
  await checkAnomalousActivity()

  console.log('[Scheduler] Verificações concluídas.')
}

let schedulerStarted = false

export function startScheduler() {
  if (schedulerStarted) return
  schedulerStarted = true

  console.log('[Scheduler] Iniciando scheduler de notificações (intervalo: 1h)')

  // Run first check after 10 seconds (give server time to fully start)
  setTimeout(() => {
    runChecks()
    // Then run every hour
    setInterval(runChecks, ONE_HOUR)
  }, 10_000)
}
