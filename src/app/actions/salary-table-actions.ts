'use server'
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getSession } from "@/lib/auth"

// ============================================================================
// SCHEMAS
// ============================================================================

const salaryTableSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  effectiveDate: z.string(),
  isActive: z.boolean().default(true),
  companyId: z.string().uuid(),
})

const salaryGradeSchema = z.object({
  jobTitle: z.string().min(2),
  level: z.string().optional(),
  baseSalary: z.coerce.number().min(0),
  hoursPerMonth: z.coerce.number().min(1).default(220),
  benefits: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  tableId: z.string().uuid(),
})

// ============================================================================
// SALARY TABLE CRUD
// ============================================================================

export async function getSalaryTables(companyId: string) {
  try {
    const tables = await prisma.salaryTable.findMany({
      where: { companyId },
      include: {
        grades: {
          orderBy: { jobTitle: 'asc' },
        },
        _count: { select: { grades: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return tables
  } catch (error) {
    console.error("Erro ao buscar tabelas salariais:", error)
    return []
  }
}

export async function createSalaryTable(data: z.infer<typeof salaryTableSchema>) {
  try {
    const session = await getSession()
    if (!session?.user?.id) return { success: false, error: "Não autenticado" }

    // Verify company access
    if (data.companyId !== session.user.companyId) {
      return { success: false, error: "Acesso negado" }
    }

    const validated = salaryTableSchema.parse(data)

    const table = await prisma.salaryTable.create({
      data: {
        name: validated.name,
        description: validated.description || null,
        effectiveDate: new Date(validated.effectiveDate),
        isActive: validated.isActive,
        companyId: validated.companyId,
      },
    })

    revalidatePath('/rh/tabela-salarial')
    return { success: true, data: table }
  } catch (error) {
    console.error("Erro ao criar tabela salarial:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar tabela salarial",
    }
  }
}

export async function updateSalaryTable(id: string, data: z.infer<typeof salaryTableSchema>) {
  try {
    const session = await getSession()
    if (!session?.user?.id) return { success: false, error: "Não autenticado" }

    // Verify table belongs to user's company
    const table = await prisma.salaryTable.findUnique({
      where: { id },
      select: { companyId: true }
    })
    if (!table || table.companyId !== session.user.companyId) {
      return { success: false, error: "Acesso negado" }
    }

    const validated = salaryTableSchema.parse(data)

    const updated = await prisma.salaryTable.update({
      where: { id },
      data: {
        name: validated.name,
        description: validated.description || null,
        effectiveDate: new Date(validated.effectiveDate),
        isActive: validated.isActive,
      },
    })

    revalidatePath('/rh/tabela-salarial')
    return { success: true, data: updated }
  } catch (error) {
    console.error("Erro ao atualizar tabela salarial:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar tabela salarial",
    }
  }
}

export async function deleteSalaryTable(id: string) {
  try {
    const session = await getSession()
    if (!session?.user?.id) return { success: false, error: "Não autenticado" }

    // Check delete permission
    if (session.user.role !== "ADMIN" && !session.user.canDelete) {
      return { success: false, error: "Sem permissão para excluir" }
    }

    // Verify table belongs to user's company
    const table = await prisma.salaryTable.findUnique({
      where: { id },
      select: { companyId: true }
    })
    if (!table || table.companyId !== session.user.companyId) {
      return { success: false, error: "Acesso negado" }
    }

    await prisma.salaryTable.delete({ where: { id } })
    revalidatePath('/rh/tabela-salarial')
    return { success: true }
  } catch (error) {
    console.error("Erro ao deletar tabela salarial:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao deletar tabela salarial",
    }
  }
}

// ============================================================================
// SALARY GRADE CRUD
// ============================================================================

function calcCostPerHour(baseSalary: number, benefits: number, taxRate: number, hoursPerMonth: number): number {
  if (hoursPerMonth <= 0) return 0
  return (baseSalary + benefits) * (1 + taxRate / 100) / hoursPerMonth
}

export async function createSalaryGrade(data: z.infer<typeof salaryGradeSchema>) {
  try {
    const session = await getSession()
    if (!session?.user?.id) return { success: false, error: "Não autenticado" }

    // Verify salary table belongs to user's company
    const table = await prisma.salaryTable.findUnique({
      where: { id: data.tableId },
      select: { companyId: true }
    })
    if (!table || table.companyId !== session.user.companyId) {
      return { success: false, error: "Acesso negado" }
    }

    const validated = salaryGradeSchema.parse(data)
    const costPerHour = calcCostPerHour(
      validated.baseSalary,
      validated.benefits,
      validated.taxRate,
      validated.hoursPerMonth,
    )

    const grade = await prisma.salaryGrade.create({
      data: {
        jobTitle: validated.jobTitle,
        level: validated.level || null,
        baseSalary: validated.baseSalary,
        costPerHour,
        hoursPerMonth: validated.hoursPerMonth,
        benefits: validated.benefits,
        taxRate: validated.taxRate,
        tableId: validated.tableId,
      },
    })

    revalidatePath('/rh/tabela-salarial')
    return { success: true, data: grade }
  } catch (error) {
    console.error("Erro ao criar grade salarial:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar grade salarial",
    }
  }
}

export async function updateSalaryGrade(id: string, data: z.infer<typeof salaryGradeSchema>) {
  try {
    const session = await getSession()
    if (!session?.user?.id) return { success: false, error: "Não autenticado" }

    // Verify grade belongs to user's company
    const existingGrade = await prisma.salaryGrade.findUnique({
      where: { id },
      select: { table: { select: { companyId: true } } }
    })
    if (!existingGrade || existingGrade.table.companyId !== session.user.companyId) {
      return { success: false, error: "Acesso negado" }
    }

    // Verify new table belongs to user's company
    const table = await prisma.salaryTable.findUnique({
      where: { id: data.tableId },
      select: { companyId: true }
    })
    if (!table || table.companyId !== session.user.companyId) {
      return { success: false, error: "Acesso negado" }
    }

    const validated = salaryGradeSchema.parse(data)
    const costPerHour = calcCostPerHour(
      validated.baseSalary,
      validated.benefits,
      validated.taxRate,
      validated.hoursPerMonth,
    )

    const grade = await prisma.salaryGrade.update({
      where: { id },
      data: {
        jobTitle: validated.jobTitle,
        level: validated.level || null,
        baseSalary: validated.baseSalary,
        costPerHour,
        hoursPerMonth: validated.hoursPerMonth,
        benefits: validated.benefits,
        taxRate: validated.taxRate,
      },
    })

    revalidatePath('/rh/tabela-salarial')
    return { success: true, data: grade }
  } catch (error) {
    console.error("Erro ao atualizar grade salarial:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar grade salarial",
    }
  }
}

export async function deleteSalaryGrade(id: string) {
  try {
    const session = await getSession()
    if (!session?.user?.id) return { success: false, error: "Não autenticado" }

    // Check delete permission
    if (session.user.role !== "ADMIN" && !session.user.canDelete) {
      return { success: false, error: "Sem permissão para excluir" }
    }

    // Verify grade belongs to user's company
    const grade = await prisma.salaryGrade.findUnique({
      where: { id },
      select: { table: { select: { companyId: true } } }
    })
    if (!grade || grade.table.companyId !== session.user.companyId) {
      return { success: false, error: "Acesso negado" }
    }

    await prisma.salaryGrade.delete({ where: { id } })
    revalidatePath('/rh/tabela-salarial')
    return { success: true }
  } catch (error) {
    console.error("Erro ao deletar grade salarial:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao deletar grade salarial",
    }
  }
}
