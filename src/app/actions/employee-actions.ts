'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getNextCode } from "@/lib/sequence"
import { getSession } from "@/lib/auth"
import { assertCanDelete } from "@/lib/permissions"

// ============================================================================
// SCHEMAS DE VALIDAÇÃO
// ============================================================================

const employeeSchema = z.object({
    name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
    jobTitle: z.string().min(2, "Cargo é obrigatório"),
    document: z.string().optional().nullable(),
    skills: z.string().optional().default("[]"),
    costPerHour: z.number().min(0, "Custo por hora não pode ser negativo").optional().nullable(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'BLOCKED']).optional(),
    companyId: z.string().uuid(),
    salaryGradeId: z.string().uuid().optional().nullable(),
    admissionDate: z.string().optional().nullable(),
    leaveDate: z.string().optional().nullable(),
    terminationDate: z.string().optional().nullable(),
    monthlySalary: z.coerce.number().min(0).optional().nullable(),
    hoursPerMonth: z.coerce.number().min(1).max(400).default(220),
    overtimeRates: z.string().default("[]"),
    housed: z.boolean().default(false),
    valeTransporte: z.boolean().default(false),
    vtDailyValue: z.coerce.number().min(0).optional().nullable(),
    valeAlimentacao: z.coerce.number().min(0).optional().nullable(),
    planoSaude: z.coerce.number().min(0).optional().nullable(),
    outrosBeneficios: z.coerce.number().min(0).optional().nullable(),
})

const benefitSchema = z.object({
    name: z.string().min(2, "Nome do benefício obrigatório"),
    type: z.enum(['PRODUCAO', 'GRATIFICACAO', 'AJUDA_CUSTO', 'DIARIA', 'OUTRO']).default('OUTRO'),
    value: z.coerce.number().min(0),
    isActive: z.boolean().default(true),
})

// ============================================================================
// CRUD DE FUNCIONÁRIOS
// ============================================================================

export async function createEmployee(data: z.infer<typeof employeeSchema>) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Check HR management permission
        if (session.user.role !== "ADMIN" && !session.user.canManageHR) {
            return { success: false, error: "Sem permissão para gerenciar RH" }
        }

        // Verify company access
        if (data.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const validated = employeeSchema.parse(data)

        const matricula = await getNextCode('employee', validated.companyId)

        // Wrap both operations in a transaction for data consistency
        const employee = await prisma.$transaction(async (tx) => {
            const emp = await tx.employee.create({
                data: {
                    matricula,
                    name: validated.name,
                    jobTitle: validated.jobTitle,
                    document: validated.document || null,
                    skills: validated.skills || "[]",
                    costPerHour: validated.costPerHour ?? null,
                    status: validated.status || 'ACTIVE',
                    companyId: validated.companyId,
                    salaryGradeId: validated.salaryGradeId || null,
                    admissionDate: validated.admissionDate ? new Date(validated.admissionDate) : null,
                    leaveDate: validated.leaveDate ? new Date(validated.leaveDate) : null,
                    terminationDate: validated.terminationDate ? new Date(validated.terminationDate) : null,
                    monthlySalary: validated.monthlySalary ?? null,
                    hoursPerMonth: validated.hoursPerMonth ?? 220,
                    overtimeRates: validated.overtimeRates ?? "[]",
                    housed: validated.housed ?? false,
                    valeTransporte: validated.valeTransporte ?? false,
                    vtDailyValue: validated.vtDailyValue ?? null,
                    valeAlimentacao: validated.valeAlimentacao ?? null,
                    planoSaude: validated.planoSaude ?? null,
                    outrosBeneficios: validated.outrosBeneficios ?? null,
                }
            })

            // Record initial salary if costPerHour is set
            if (validated.costPerHour != null && validated.costPerHour > 0) {
                await tx.salaryHistory.create({
                    data: {
                        employeeId: emp.id,
                        previousCost: null,
                        newCost: validated.costPerHour,
                        reason: "Cadastro inicial",
                    }
                })
            }

            return emp
        })

        revalidatePath('/rh/funcionarios')
        return { success: true, data: employee }
    } catch (error) {
        console.error("Erro ao criar funcionário:", error)
        return {
            success: false,
            error: error instanceof Error ? error.message : "Erro ao criar funcionário"
        }
    }
}

export async function updateEmployee(id: string, data: z.infer<typeof employeeSchema>) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Check HR management permission
        if (session.user.role !== "ADMIN" && !session.user.canManageHR) {
            return { success: false, error: "Sem permissão para gerenciar RH" }
        }

        // Fetch current employee to compare costPerHour and verify company access
        const current = await prisma.employee.findUnique({
            where: { id },
            select: { id: true, companyId: true, costPerHour: true }
        })
        if (!current || current.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const validated = employeeSchema.parse(data)

        const employee = await prisma.employee.update({
            where: { id },
            data: {
                name: validated.name,
                jobTitle: validated.jobTitle,
                document: validated.document || null,
                skills: validated.skills || "[]",
                costPerHour: validated.costPerHour ?? null,
                status: validated.status || 'ACTIVE',
                salaryGradeId: validated.salaryGradeId || null,
                admissionDate: validated.admissionDate ? new Date(validated.admissionDate) : null,
                leaveDate: validated.leaveDate ? new Date(validated.leaveDate) : null,
                terminationDate: validated.terminationDate ? new Date(validated.terminationDate) : null,
                monthlySalary: validated.monthlySalary ?? null,
                hoursPerMonth: validated.hoursPerMonth ?? 220,
                overtimeRates: validated.overtimeRates ?? "[]",
                housed: validated.housed ?? false,
                valeTransporte: validated.valeTransporte ?? false,
                vtDailyValue: validated.vtDailyValue ?? null,
                valeAlimentacao: validated.valeAlimentacao ?? null,
                planoSaude: validated.planoSaude ?? null,
                outrosBeneficios: validated.outrosBeneficios ?? null,
            }
        })

        // Record salary change if costPerHour changed
        const prevCost = current?.costPerHour != null ? Number(current.costPerHour) : null
        const newCost = validated.costPerHour ?? null

        const costChanged = prevCost !== newCost
        if (costChanged && newCost != null) {
            await prisma.salaryHistory.create({
                data: {
                    employeeId: id,
                    previousCost: prevCost,
                    newCost: newCost,
                    reason: null,
                }
            })
        }

        revalidatePath('/rh/funcionarios')
        revalidatePath(`/rh/funcionarios/${id}`)
        return { success: true, data: employee }
    } catch (error) {
        console.error("Erro ao atualizar funcionário:", error)
        return {
            success: false,
            error: "Erro ao atualizar funcionário"
        }
    }
}

export async function inactivateEmployee(id: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Check HR management permission
        if (session.user.role !== "ADMIN" && !session.user.canManageHR) {
            return { success: false, error: "Sem permissão para gerenciar RH" }
        }

        // Verify employee belongs to user's company
        const existing = await prisma.employee.findUnique({
            where: { id },
            select: { companyId: true }
        })
        if (!existing || existing.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const employee = await prisma.employee.update({
            where: { id },
            data: {
                status: 'INACTIVE',
            }
        })

        revalidatePath('/rh/funcionarios')
        return { success: true, data: employee }
    } catch (error) {
        console.error("Erro ao inativar funcionário:", error)
        return {
            success: false,
            error: "Erro ao inativar funcionário"
        }
    }
}

export async function changeEmployeeStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'ON_LEAVE') {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Check HR management permission
        if (session.user.role !== "ADMIN" && !session.user.canManageHR) {
            return { success: false, error: "Sem permissão para gerenciar RH" }
        }

        // Verify employee belongs to user's company
        const existing = await prisma.employee.findUnique({
            where: { id },
            select: { companyId: true }
        })
        if (!existing || existing.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const employee = await prisma.employee.update({
            where: { id },
            data: { status },
        })
        revalidatePath('/rh/funcionarios')
        revalidatePath(`/rh/funcionarios/${id}`)
        return { success: true, data: employee }
    } catch (error) {
        console.error("Erro ao alterar status do funcionário:", error)
        return { success: false, error: "Erro ao alterar status do funcionário" }
    }
}

export async function updateMatricula(employeeId: string, matricula: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Check HR management permission
        if (session.user.role !== "ADMIN" && !session.user.canManageHR) {
            return { success: false, error: "Sem permissão para gerenciar RH" }
        }

        // Verify employee belongs to user's company
        const existing = await prisma.employee.findUnique({
            where: { id: employeeId },
            select: { companyId: true }
        })
        if (!existing || existing.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const employee = await prisma.employee.update({
            where: { id: employeeId },
            data: { matricula },
        })
        revalidatePath('/rh/funcionarios')
        revalidatePath(`/rh/funcionarios/${employeeId}`)
        return { success: true, data: employee }
    } catch (error) {
        console.error("Erro ao atualizar matrícula:", error)
        return { success: false, error: "Erro ao atualizar matrícula" }
    }
}

export async function deleteEmployee(id: string) {
    const session = await getSession()
    if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

    // Check HR management and delete permissions
    if (session.user.role !== "ADMIN" && !session.user.canManageHR) {
        return { success: false, error: "Sem permissão para gerenciar RH" }
    }
    if (session.user.role !== "ADMIN" && !session.user.canDelete) {
        return { success: false, error: "Sem permissão para excluir" }
    }

    try {
        const employee = await prisma.employee.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        allocations: true,
                        measurements: true,
                    }
                }
            }
        })

        if (!employee) {
            return { success: false, error: "Funcionário não encontrado" }
        }

        // Verify company access
        if (employee.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        if (employee._count.allocations > 0 || employee._count.measurements > 0) {
            return {
                success: false,
                error: "Não é possível excluir funcionários com registros vinculados. Use 'Inativar' ao invés de excluir."
            }
        }

        await prisma.employee.delete({
            where: { id }
        })

        revalidatePath('/rh/funcionarios')
        return { success: true }
    } catch (error) {
        console.error("Erro ao deletar funcionário:", error)
        return {
            success: false,
            error: "Erro ao deletar funcionário"
        }
    }
}

export async function getEmployees(companyId: string, status?: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE') {
    try {
        const employees = await prisma.employee.findMany({
            where: {
                companyId,
                ...(status && { status }),
            },
            include: {
                _count: {
                    select: {
                        allocations: true,
                        measurements: true,
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        })

        return employees.map(emp => ({
            ...emp,
            costPerHour: emp.costPerHour ? Number(emp.costPerHour) : null,
        }))
    } catch (error) {
        console.error("Erro ao buscar funcionários:", error)
        return []
    }
}

export async function getEmployeeById(id: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

        const employee = await prisma.employee.findUnique({
            where: { id },
            include: {
                company: true,
                salaryGrade: {
                    include: { table: true }
                },
                allocations: {
                    include: {
                        project: true,
                    }
                },
                measurements: {
                    orderBy: { date: 'desc' },
                    take: 10,
                },
                salaryHistory: {
                    orderBy: { effectiveDate: 'desc' },
                },
                variableBenefits: {
                    orderBy: { createdAt: 'asc' },
                },
                _count: {
                    select: {
                        allocations: true,
                        measurements: true,
                    }
                }
            }
        })

        if (!employee) {
            return null
        }

        // Verify company access
        if (employee.companyId !== session.user.companyId) {
            return null
        }

        return {
            ...employee,
            costPerHour: employee.costPerHour ? Number(employee.costPerHour) : null,
            monthlySalary: employee.monthlySalary ? Number(employee.monthlySalary) : null,
            vtDailyValue: employee.vtDailyValue ? Number(employee.vtDailyValue) : null,
            valeAlimentacao: employee.valeAlimentacao ? Number(employee.valeAlimentacao) : null,
            planoSaude: employee.planoSaude ? Number(employee.planoSaude) : null,
            outrosBeneficios: employee.outrosBeneficios ? Number(employee.outrosBeneficios) : null,
            salaryGrade: employee.salaryGrade ? {
                ...employee.salaryGrade,
                baseSalary: Number(employee.salaryGrade.baseSalary),
                costPerHour: Number(employee.salaryGrade.costPerHour),
                benefits: Number(employee.salaryGrade.benefits),
                taxRate: Number(employee.salaryGrade.taxRate),
            } : null,
            salaryHistory: employee.salaryHistory.map(h => ({
                ...h,
                previousCost: h.previousCost != null ? Number(h.previousCost) : null,
                newCost: Number(h.newCost),
            })),
            variableBenefits: employee.variableBenefits.map(b => ({
                ...b,
                value: Number(b.value),
            })),
        }
    } catch (error) {
        console.error("Erro ao buscar funcionário:", error)
        return null
    }
}

// ============================================================================
// CRUD DE BENEFÍCIOS VARIÁVEIS
// ============================================================================

export async function addEmployeeBenefit(employeeId: string, data: z.infer<typeof benefitSchema>) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Check HR management permission
        if (session.user.role !== "ADMIN" && !session.user.canManageHR) {
            return { success: false, error: "Sem permissão para gerenciar RH" }
        }

        // Verify employee belongs to user's company
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            select: { companyId: true }
        })
        if (!employee || employee.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const validated = benefitSchema.parse(data)
        const benefit = await prisma.employeeBenefit.create({
            data: { ...validated, employeeId }
        })
        revalidatePath(`/rh/funcionarios/${employeeId}`)
        return { success: true, data: { ...benefit, value: Number(benefit.value) } }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Erro ao adicionar benefício' }
    }
}

export async function updateEmployeeBenefit(benefitId: string, employeeId: string, data: z.infer<typeof benefitSchema>) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Check HR management permission
        if (session.user.role !== "ADMIN" && !session.user.canManageHR) {
            return { success: false, error: "Sem permissão para gerenciar RH" }
        }

        // Verify employee belongs to user's company
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            select: { companyId: true }
        })
        if (!employee || employee.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const validated = benefitSchema.parse(data)
        const benefit = await prisma.employeeBenefit.update({
            where: { id: benefitId },
            data: validated
        })
        revalidatePath(`/rh/funcionarios/${employeeId}`)
        return { success: true, data: { ...benefit, value: Number(benefit.value) } }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Erro ao atualizar benefício' }
    }
}

export async function deleteEmployeeBenefit(benefitId: string, employeeId: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        // Check HR management and delete permissions
        if (session.user.role !== "ADMIN" && !session.user.canManageHR) {
            return { success: false, error: "Sem permissão para gerenciar RH" }
        }
        if (session.user.role !== "ADMIN" && !session.user.canDelete) {
            return { success: false, error: "Sem permissão para excluir" }
        }

        // Verify employee belongs to user's company
        const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            select: { companyId: true }
        })
        if (!employee || employee.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        await prisma.employeeBenefit.delete({ where: { id: benefitId } })
        revalidatePath(`/rh/funcionarios/${employeeId}`)
        return { success: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Erro ao excluir benefício' }
    }
}

export async function getSalaryHistory(employeeId: string) {
    try {
        const history = await prisma.salaryHistory.findMany({
            where: { employeeId },
            orderBy: { effectiveDate: 'desc' },
        })
        return {
            success: true,
            data: history.map(h => ({
                ...h,
                previousCost: Number(h.previousCost),
                newCost: Number(h.newCost),
            })),
        }
    } catch (error) {
        console.error("Erro ao buscar histórico salarial:", error)
        return { success: false, error: "Erro ao buscar histórico salarial", data: [] }
    }
}
