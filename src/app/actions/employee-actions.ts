'use server'

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getNextCode } from "@/lib/sequence"
import { getSession } from "@/lib/auth"
import { assertCanDelete } from "@/lib/permissions"
import { getPaginationArgs, paginatedResponse, type PaginationParams } from "@/lib/pagination"
import { buildWhereClause, type FilterParams } from "@/lib/filters"
import { logCreate, logUpdate, logDelete, logAction } from '@/lib/audit-logger'

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

        await logCreate('Employee', employee.id, employee.name, validated)

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

        await logUpdate('Employee', id, employee.name, current, employee)

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
            select: { companyId: true, name: true }
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

        await logAction('DEACTIVATE', 'Employee', id, employee.name, 'Funcionário inativado')

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
            select: { companyId: true, name: true, status: true }
        })
        if (!existing || existing.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const employee = await prisma.employee.update({
            where: { id },
            data: { status },
        })

        await logAction('STATUS_CHANGE', 'Employee', id, employee.name, `Status alterado de ${existing.status} para ${status}`)

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
            select: { companyId: true, name: true, matricula: true }
        })
        if (!existing || existing.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const employee = await prisma.employee.update({
            where: { id: employeeId },
            data: { matricula },
        })

        await logAction('UPDATE', 'Employee', employeeId, employee.name, `Matrícula alterada de ${existing.matricula || 'N/A'} para ${matricula}`)

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

        await logDelete('Employee', id, employee.name, employee)

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

export async function getEmployees(params?: {
    companyId?: string
    status?: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE'
    pagination?: PaginationParams
    filters?: FilterParams
}) {
    try {
        const session = await getSession()
        if (!session?.user) return { success: true, data: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } }

        const { skip, take, page, pageSize } = getPaginationArgs(params?.pagination)
        const filterWhere = buildWhereClause(params?.filters || {}, ['name', 'matricula'])
        const where = {
            companyId: (session.user as any).companyId,
            ...(params?.status && { status: params.status }),
            ...filterWhere
        }

        const [employees, total] = await Promise.all([
            prisma.employee.findMany({
                where,
                skip,
                take,
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
            }),
            prisma.employee.count({ where })
        ])

        const mapped = employees.map(emp => ({
            ...emp,
            costPerHour: emp.costPerHour ? Number(emp.costPerHour) : null,
        }))

        return { success: true, data: mapped, pagination: paginatedResponse(mapped, total, page, pageSize).pagination }
    } catch (error) {
        console.error("Erro ao buscar funcionários:", error)
        return { success: false, error: error instanceof Error ? error.message : "Erro ao buscar funcionários", data: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } }
    }
}

export async function getEmployeeById(id: string) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

        const employee = await prisma.employee.findUnique({
            where: { id },
            include: {
                company: {
                    select: { id: true, name: true, cnpj: true },
                },
                salaryGrade: {
                    include: {
                        table: {
                            select: { id: true, name: true, effectiveDate: true },
                        },
                    }
                },
                allocations: {
                    include: {
                        project: {
                            select: { id: true, name: true, code: true, status: true },
                        },
                    }
                },
                measurements: {
                    select: {
                        id: true,
                        date: true,
                        quantity: true,
                        description: true,
                        status: true,
                        projectId: true,
                        contractItemId: true,
                        createdAt: true,
                    },
                    orderBy: { date: 'desc' },
                    take: 10,
                },
                salaryHistory: {
                    orderBy: { effectiveDate: 'desc' },
                    take: 20,
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

        await logCreate('EmployeeBenefit', benefit.id, benefit.name, validated)

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
        const oldBenefit = await prisma.employeeBenefit.findUnique({ where: { id: benefitId } })
        const benefit = await prisma.employeeBenefit.update({
            where: { id: benefitId },
            data: validated
        })

        await logUpdate('EmployeeBenefit', benefitId, benefit.name, oldBenefit, benefit)

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

        const oldBenefit = await prisma.employeeBenefit.findUnique({ where: { id: benefitId } })
        await prisma.employeeBenefit.delete({ where: { id: benefitId } })

        if (oldBenefit) {
            await logDelete('EmployeeBenefit', benefitId, oldBenefit.name, oldBenefit)
        }

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

// ============================================================================
// ORGANOGRAMA – EDIÇÃO DE HIERARQUIA
// ============================================================================

export async function updateEmployeeDepartment(employeeId: string, department: string | null) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        if (session.user.role !== "ADMIN" && !session.user.canManageHR) {
            return { success: false, error: "Sem permissão para gerenciar RH" }
        }

        const existing = await prisma.employee.findUnique({
            where: { id: employeeId },
            select: { companyId: true, name: true, department: true }
        })
        if (!existing || existing.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        const employee = await prisma.employee.update({
            where: { id: employeeId },
            data: { department: department || null },
        })

        await logAction('UPDATE', 'Employee', employeeId, employee.name, `Departamento alterado de "${existing.department || 'Nenhum'}" para "${department || 'Nenhum'}"`)

        revalidatePath('/rh/organograma')
        revalidatePath('/rh/funcionarios')
        return { success: true, data: employee }
    } catch (error) {
        console.error("Erro ao atualizar departamento:", error)
        return { success: false, error: "Erro ao atualizar departamento" }
    }
}

export async function updateEmployeeManager(employeeId: string, managerId: string | null) {
    try {
        const session = await getSession()
        if (!session?.user?.id) return { success: false, error: "Não autenticado" }

        if (session.user.role !== "ADMIN" && !session.user.canManageHR) {
            return { success: false, error: "Sem permissão para gerenciar RH" }
        }

        const existing = await prisma.employee.findUnique({
            where: { id: employeeId },
            select: { companyId: true, name: true, managerId: true }
        })
        if (!existing || existing.companyId !== session.user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        // Prevent self-reference
        if (managerId === employeeId) {
            return { success: false, error: "Colaborador não pode ser gestor de si mesmo" }
        }

        // Prevent circular hierarchy: walk up from managerId to ensure employeeId is not an ancestor
        if (managerId) {
            let currentId: string | null = managerId
            const visited = new Set<string>()
            while (currentId) {
                if (currentId === employeeId) {
                    return { success: false, error: "Referência circular detectada na hierarquia" }
                }
                if (visited.has(currentId)) break
                visited.add(currentId)
                const parent = await prisma.employee.findUnique({
                    where: { id: currentId },
                    select: { managerId: true }
                })
                currentId = parent?.managerId ?? null
            }
        }

        const employee = await prisma.employee.update({
            where: { id: employeeId },
            data: { managerId: managerId || null },
        })

        const oldManagerName = existing.managerId
            ? (await prisma.employee.findUnique({ where: { id: existing.managerId }, select: { name: true } }))?.name || 'N/A'
            : 'Nenhum'
        const newManagerName = managerId
            ? (await prisma.employee.findUnique({ where: { id: managerId }, select: { name: true } }))?.name || 'N/A'
            : 'Nenhum'

        await logAction('UPDATE', 'Employee', employeeId, employee.name, `Gestor alterado de "${oldManagerName}" para "${newManagerName}"`)

        revalidatePath('/rh/organograma')
        revalidatePath('/rh/funcionarios')
        return { success: true, data: employee }
    } catch (error) {
        console.error("Erro ao atualizar gestor:", error)
        return { success: false, error: "Erro ao atualizar gestor" }
    }
}
