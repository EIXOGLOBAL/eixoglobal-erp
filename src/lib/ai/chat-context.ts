/**
 * Contexto de dados para o chat da IA.
 *
 * Consulta dados REAIS do banco e formata como texto conciso
 * para injetar no system prompt. A IA passa a responder com
 * base nos dados atuais do ERP, nao em suposicoes.
 */

import { prisma } from '@/lib/prisma'

// ============================================================================
// Types
// ============================================================================

interface ChatContextOptions {
  companyId: string
  userId: string
  module: string
  userRole: string
}

// ============================================================================
// Helpers
// ============================================================================

function fmtBRL(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '-'
  return d.toLocaleDateString('pt-BR')
}

// ============================================================================
// Consultas por modulo
// ============================================================================

async function getGeneralContext(companyId: string): Promise<string> {
  const [projectCount, employeeCount, taskCount] = await Promise.all([
    prisma.project.count({ where: { companyId } }),
    prisma.employee.count({ where: { companyId, status: 'ACTIVE' } }),
    prisma.workTask.count({ where: { companyId, status: { in: ['TODO', 'IN_PROGRESS'] } } }),
  ])

  // Projetos por status
  const projectsByStatus = await prisma.project.groupBy({
    by: ['status'],
    where: { companyId },
    _count: true,
  })

  const statusMap = projectsByStatus.map((p) => `${p.status}: ${p._count}`).join(', ')

  return [
    '--- DADOS REAIS DO SISTEMA ---',
    `Projetos total: ${projectCount} (${statusMap})`,
    `Funcionarios ativos: ${employeeCount}`,
    `Tarefas pendentes: ${taskCount}`,
    '--- FIM DADOS ---',
  ].join('\n')
}

async function getFinancialContext(companyId: string): Promise<string> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600000)

  // Receitas e despesas do mes
  const records = await prisma.financialRecord.findMany({
    where: {
      companyId,
      createdAt: { gte: startOfMonth },
    },
    select: { amount: true, type: true, status: true, category: true },
  })

  const income = records
    .filter((r) => r.type === 'INCOME')
    .reduce((s, r) => s + Number(r.amount), 0)
  const expense = records
    .filter((r) => r.type === 'EXPENSE')
    .reduce((s, r) => s + Number(r.amount), 0)
  const pending = records.filter((r) => r.status === 'PENDING').length
  const paid = records.filter((r) => r.status === 'PAID').length

  // Contas bancarias
  let bankInfo = ''
  try {
    const banks = await prisma.bankAccount.findMany({
      where: { companyId },
      select: { name: true, balance: true },
    })
    if (banks.length > 0) {
      const totalBalance = banks.reduce((s, b) => s + Number(b.balance), 0)
      bankInfo = `Saldo bancario total: ${fmtBRL(totalBalance)} (${banks.length} contas)`
    }
  } catch {
    // tabela pode nao existir
  }

  // A vencer nos proximos 30 dias
  const receivables = await prisma.financialRecord.count({
    where: {
      companyId,
      type: 'INCOME',
      status: 'PENDING',
      dueDate: { gte: now, lte: new Date(now.getTime() + 30 * 24 * 3600000) },
    },
  })

  const payables = await prisma.financialRecord.count({
    where: {
      companyId,
      type: 'EXPENSE',
      status: 'PENDING',
      dueDate: { gte: now, lte: new Date(now.getTime() + 30 * 24 * 3600000) },
    },
  })

  // Vencidos
  const overdue = await prisma.financialRecord.count({
    where: {
      companyId,
      status: 'PENDING',
      dueDate: { lt: now },
    },
  })

  // Despesas por categoria (top 5)
  const byCategory = records
    .filter((r) => r.type === 'EXPENSE' && r.category)
    .reduce<Record<string, number>>((acc, r) => {
      const cat = r.category || 'Outros'
      acc[cat] = (acc[cat] || 0) + Number(r.amount)
      return acc
    }, {})
  const topCategories = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cat, val]) => `  ${cat}: ${fmtBRL(val)}`)
    .join('\n')

  return [
    '--- DADOS FINANCEIROS REAIS (MES ATUAL) ---',
    `Receitas: ${fmtBRL(income)}`,
    `Despesas: ${fmtBRL(expense)}`,
    `Saldo do mes: ${fmtBRL(income - expense)}`,
    `Registros: ${records.length} (${paid} pagos, ${pending} pendentes)`,
    bankInfo || null,
    `Recebiveis proximos 30d: ${receivables}`,
    `Pagamentos proximos 30d: ${payables}`,
    `Vencidos: ${overdue}`,
    topCategories ? `Despesas por categoria:\n${topCategories}` : null,
    '--- FIM DADOS ---',
  ]
    .filter(Boolean)
    .join('\n')
}

async function getProjectsContext(companyId: string): Promise<string> {
  const projects = await prisma.project.findMany({
    where: { companyId },
    select: {
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      budget: true,
      _count: { select: { allocations: true, measurements: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 15,
  })

  const lines = projects.map((p) => {
    const budget = p.budget ? fmtBRL(Number(p.budget)) : 'N/D'
    const period = `${fmtDate(p.startDate)} - ${fmtDate(p.endDate)}`
    return `  - ${p.name} | ${p.status} | ${period} | Orcamento: ${budget} | ${p._count.allocations} alocacoes, ${p._count.measurements} medicoes`
  })

  // Contratos ativos
  let contractInfo = ''
  try {
    const contracts = await prisma.contract.findMany({
      where: { companyId, status: 'ACTIVE' },
      select: { identifier: true, value: true },
      take: 10,
    })
    if (contracts.length > 0) {
      const totalValue = contracts.reduce((s, c) => s + Number(c.value), 0)
      contractInfo = `Contratos ativos: ${contracts.length} (valor total: ${fmtBRL(totalValue)})`
    }
  } catch {
    // tabela pode nao existir
  }

  return [
    '--- DADOS DE PROJETOS REAIS ---',
    `Total: ${projects.length} projetos`,
    ...lines,
    contractInfo || null,
    '--- FIM DADOS ---',
  ]
    .filter(Boolean)
    .join('\n')
}

async function getHRContext(companyId: string, userRole: string): Promise<string> {
  // Dados sensiveis de RH apenas para ADMIN
  const employees = await prisma.employee.findMany({
    where: { companyId, status: 'ACTIVE' },
    select: {
      name: true,
      jobTitle: true,
      department: true,
      _count: { select: { allocations: true } },
    },
    orderBy: { name: 'asc' },
    take: 30,
  })

  const allocated = employees.filter((e) => e._count.allocations > 0).length
  const allocationRate = employees.length > 0
    ? Math.round((allocated / employees.length) * 100)
    : 0

  // Departamentos
  const depts = employees.reduce<Record<string, number>>((acc, e) => {
    const dept = e.department || 'Sem departamento'
    acc[dept] = (acc[dept] || 0) + 1
    return acc
  }, {})
  const deptLines = Object.entries(depts)
    .sort(([, a], [, b]) => b - a)
    .map(([d, c]) => `  ${d}: ${c}`)
    .join('\n')

  const lines = [
    '--- DADOS DE RH REAIS ---',
    `Funcionarios ativos: ${employees.length}`,
    `Taxa de alocacao: ${allocationRate}%`,
    `Por departamento:\n${deptLines}`,
  ]

  // Ferias pendentes
  try {
    const pendingVacations = await prisma.vacationRequest.count({
      where: {
        employee: { companyId },
        status: 'PENDING',
      },
    })
    lines.push(`Ferias pendentes: ${pendingVacations}`)
  } catch {
    // tabela pode nao existir
  }

  lines.push('--- FIM DADOS ---')
  return lines.join('\n')
}

async function getSupplyContext(companyId: string): Promise<string> {
  const materials = await prisma.material.findMany({
    where: { companyId },
    select: {
      name: true,
      unit: true,
      currentStock: true,
      minStock: true,
      category: true,
    },
    orderBy: { name: 'asc' },
    take: 50,
  })

  const lowStock = materials.filter(
    (m) =>
      m.minStock !== null &&
      m.currentStock !== null &&
      Number(m.currentStock) <= Number(m.minStock)
  )

  const lines = [
    '--- DADOS DE ESTOQUE REAIS ---',
    `Total de materiais: ${materials.length}`,
    `Itens com estoque baixo: ${lowStock.length}`,
  ]

  if (lowStock.length > 0) {
    lines.push('Itens criticos:')
    for (const m of lowStock.slice(0, 10)) {
      lines.push(
        `  - ${m.name}: ${Number(m.currentStock ?? 0)} ${m.unit} (minimo: ${Number(m.minStock ?? 0)})`
      )
    }
  }

  lines.push('--- FIM DADOS ---')
  return lines.join('\n')
}

// ============================================================================
// Funcao principal
// ============================================================================

/**
 * Retorna contexto de dados reais do banco para injetar no prompt da IA.
 * Consultas leves e otimizadas — retorna texto conciso.
 */
export async function getChatDataContext(options: ChatContextOptions): Promise<string> {
  const { companyId, module, userRole } = options

  try {
    // Contexto geral sempre incluido
    const general = await getGeneralContext(companyId)

    // Contexto especifico do modulo
    let moduleContext = ''

    if (module.startsWith('/financeiro') || module.startsWith('/orcamentos')) {
      moduleContext = await getFinancialContext(companyId)
    } else if (
      module.startsWith('/projects') ||
      module.startsWith('/contratos') ||
      module.startsWith('/measurements') ||
      module.startsWith('/medicoes') ||
      module.startsWith('/rdo')
    ) {
      moduleContext = await getProjectsContext(companyId)
    } else if (
      module.startsWith('/rh') ||
      module.startsWith('/dep-pessoal') ||
      module.startsWith('/ponto')
    ) {
      moduleContext = await getHRContext(companyId, userRole)
    } else if (
      module.startsWith('/estoque') ||
      module.startsWith('/compras') ||
      module.startsWith('/equipamentos')
    ) {
      moduleContext = await getSupplyContext(companyId)
    }

    return [general, moduleContext].filter(Boolean).join('\n\n')
  } catch (error) {
    console.error('[ChatContext] Erro ao buscar dados:', error)
    return '(Erro ao carregar dados do sistema — responda com base no conhecimento geral.)'
  }
}
