import { prisma } from '@/lib/prisma'
import { notifyUsers } from '@/lib/sse-notifications'
import { toNumber } from '@/lib/formatters'

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
    where: { companyId, role: { in: ['ADMIN', 'MANAGER', 'ENGINEER'] } },
    select: { id: true },
  })
  return users.map(u => u.id)
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

async function runChecks() {
  console.log('[Scheduler] Executando verificações de notificações...')
  await checkExpiringContracts()
  await checkLowStockMaterials()
  await checkOverdueMaintenances()
  await checkExpiringSupplierDocuments()
  await checkCostCenterBudgetOverruns()
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
