import { prisma } from '@/lib/prisma'
import { notifyUsers } from '@/lib/sse-notifications'
import { toNumber } from '@/lib/formatters'
import { whatsappService } from '@/lib/whatsapp'

const ONE_HOUR = 60 * 60 * 1000

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

  await prisma.notification.createMany({
    data: adminIds.map(userId => ({
      userId,
      companyId,
      ...notifData,
    })),
  })
  notifyUsers(adminIds, notifData)

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

    // Contracts expiring in 7 days
    const soonContracts = await prisma.contract.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { gte: now, lte: in7Days },
      },
      select: { id: true, identifier: true, companyId: true },
    })

    for (const contract of soonContracts) {
      const link = `/contratos/${contract.id}`
      if (await alreadyNotifiedToday(contract.companyId, 'CONTRACT_EXPIRING', link)) continue

      const userIds = await getManagerIds(contract.companyId)
      if (userIds.length === 0) continue

      const notifData = {
        type: 'CONTRACT_EXPIRING',
        title: 'Contrato vencendo em breve',
        message: `O contrato ${contract.identifier} vence em menos de 7 dias.`,
        link,
      }

      await prisma.notification.createMany({
        data: userIds.map(userId => ({
          userId,
          companyId: contract.companyId,
          ...notifData,
        })),
      })
      notifyUsers(userIds, notifData)
    }

    // Contracts expiring in 30 days
    const upcomingContracts = await prisma.contract.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { gt: in7Days, lte: in30Days },
      },
      select: { id: true, identifier: true, companyId: true },
    })

    for (const contract of upcomingContracts) {
      const link = `/contratos/${contract.id}`
      if (await alreadyNotifiedToday(contract.companyId, 'CONTRACT_EXPIRING', link)) continue

      const userIds = await getManagerIds(contract.companyId)
      if (userIds.length === 0) continue

      const notifData = {
        type: 'CONTRACT_EXPIRING',
        title: 'Contrato com vencimento próximo',
        message: `O contrato ${contract.identifier} vence em menos de 30 dias.`,
        link,
      }

      await prisma.notification.createMany({
        data: userIds.map(userId => ({
          userId,
          companyId: contract.companyId,
          ...notifData,
        })),
      })
      notifyUsers(userIds, notifData)
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

      await prisma.notification.createMany({
        data: userIds.map(userId => ({
          userId,
          companyId: mat.companyId,
          ...notifData,
        })),
      })
      notifyUsers(userIds, notifData)
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
    })

    for (const m of overdue) {
      const link = `/equipamentos/${m.equipment.id}`
      if (await alreadyNotifiedToday(m.equipment.companyId, 'EQUIPMENT_MAINTENANCE', link)) continue

      const userIds = await getManagerIds(m.equipment.companyId)
      if (userIds.length === 0) continue

      const notifData = {
        type: 'EQUIPMENT_MAINTENANCE',
        title: 'Manutenção atrasada',
        message: `Manutenção "${m.description}" do equipamento ${m.equipment.name} está atrasada.`,
        link,
      }

      await prisma.notification.createMany({
        data: userIds.map(userId => ({
          userId,
          companyId: m.equipment.companyId,
          ...notifData,
        })),
      })
      notifyUsers(userIds, notifData)
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
      include: {
        supplier: {
          select: { id: true, name: true, companyId: true },
        },
      },
    })

    for (const doc of expiringDocs) {
      const link = `/fornecedores/${doc.supplier.id}`
      if (await alreadyNotifiedToday(doc.supplier.companyId, 'SUPPLIER_DOC_EXPIRING', link + `#${doc.id}`)) continue

      const userIds = await getManagerIds(doc.supplier.companyId)
      if (userIds.length === 0) continue

      const daysLeft = Math.ceil((doc.expiresAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      const notifData = {
        type: 'SUPPLIER_DOC_EXPIRING',
        title: 'Documento de fornecedor vencendo',
        message: `Documento "${doc.filename}" do fornecedor ${doc.supplier.name} vence em ${daysLeft} dias.`,
        link,
      }

      await prisma.notification.createMany({
        data: userIds.map(userId => ({
          userId,
          companyId: doc.supplier.companyId,
          ...notifData,
        })),
      })
      notifyUsers(userIds, notifData)
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

        await prisma.notification.createMany({
          data: userIds.map(userId => ({
            userId,
            companyId: budget.costCenter.companyId,
            ...notifData,
          })),
        })
        notifyUsers(userIds, notifData)
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
