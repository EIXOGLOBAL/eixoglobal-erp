'use server'

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from '@/lib/auth';
import { getPaginationArgs, paginatedResponse, type PaginationParams } from '@/lib/pagination';
import { buildWhereClause, type FilterParams } from '@/lib/filters';

// Schemas
const CreateSchema = z.object({
    projectId: z.string().uuid(),
    contractItemId: z.string().uuid(),
    quantity: z.number().min(0.01),
    date: z.string(), // ISO String or Date
    description: z.string().optional(),
    unitPrice: z.number().optional(),
    employeeId: z.string().optional(),
});

const UpdateSchema = CreateSchema.partial();

export async function createMeasurementAction(data: z.infer<typeof CreateSchema>) {
    const session = await getSession()
    if (!session?.user) return { success: false, error: 'Não autenticado' }
    const user = session.user as { id: string; role: string; companyId: string }

    try {
        // Verify project belongs to user's company
        const project = await prisma.project.findUnique({
            where: { id: data.projectId },
            select: { companyId: true }
        })
        if (!project || project.companyId !== user.companyId) {
            return { success: false, error: 'Acesso negado' }
        }

        const measurement = await prisma.measurement.create({
            data: {
                projectId: data.projectId,
                contractItemId: data.contractItemId,
                quantity: data.quantity,
                date: new Date(data.date),
                description: data.description,
                employeeId: data.employeeId,
                registeredById: user.id,
                companyId: user.companyId, // Set company ownership
                status: 'SUBMITTED' as const // Default to SUBMITTED for consistency
            }
        });
        revalidatePath("/dashboard/medicoes");

        // Serialize for client
        const serialized = {
            ...measurement,
            quantity: Number(measurement.quantity),
            // We might want to fetch included relations if needed, but for now just basic fields
        };

        return { success: true, data: serialized };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getMeasurements(params?: {
    status?: 'PENDING' | 'ALL'
    pagination?: PaginationParams
    filters?: FilterParams
}) {
    const session = await getSession()
    if (!session?.user) return { success: false, error: 'Não autenticado', data: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } }
    const user = session.user as { id: string; role: string; companyId: string }

    try {
        const { skip, take, page, pageSize } = getPaginationArgs(params?.pagination)
        const filterWhere = buildWhereClause(params?.filters || {}, ['description'])

        const where: any = {
            project: {
                companyId: user.companyId
            },
            ...filterWhere
        }
        if (params?.status === 'PENDING') {
            where.status = 'PENDING'
        }

        const [measurements, total] = await Promise.all([
            prisma.measurement.findMany({
                where,
                skip,
                take,
                orderBy: { date: 'desc' },
                include: {
                    project: true,
                    employee: true,
                    contractItem: true
                }
            }),
            prisma.measurement.count({ where })
        ])

        // Serialize Decimals for client components
        const serialized = measurements.map(m => ({
            ...m,
            quantity: Number(m.quantity),
            contractItem: {
                ...m.contractItem,
                unitPrice: Number(m.contractItem.unitPrice)
            }
        }))

        return { success: true, data: serialized, pagination: paginatedResponse(serialized, total, page, pageSize).pagination }
    } catch (error: any) {
        return { success: false, error: error.message, data: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } }
    }
}

export async function approveMeasurement(id: string) {
    const session = await getSession()
    if (!session?.user) return { success: false, error: 'Não autenticado' }
    const user = session.user as { id: string; role: string; companyId: string }

    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
        return { success: false, error: "Unauthorized" };
    }

    try {
        // Verify measurement belongs to user's company
        const measurement = await prisma.measurement.findUnique({
            where: { id },
            select: { project: { select: { companyId: true } } }
        })
        if (!measurement || measurement.project.companyId !== user.companyId) {
            return { success: false, error: 'Acesso negado' }
        }

        await prisma.measurement.update({
            where: { id },
            data: {
                status: "APPROVED",
                approvedById: user.id
            }
        });
        revalidatePath("/dashboard/medicoes");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function rejectMeasurement(id: string, reason: string) {
    const session = await getSession()
    if (!session?.user) return { success: false, error: 'Não autenticado' }
    const user = session.user as { id: string; role: string; companyId: string }

    try {
        // Verify measurement belongs to user's company
        const measurement = await prisma.measurement.findUnique({
            where: { id },
            select: { project: { select: { companyId: true } } }
        })
        if (!measurement || measurement.project.companyId !== user.companyId) {
            return { success: false, error: 'Acesso negado' }
        }

        await prisma.measurement.update({
            where: { id },
            data: {
                status: 'REJECTED',
                rejectionReason: reason,
                // Do not set approvedById when rejecting - only set when approved
            }
        });
        revalidatePath("/dashboard/medicoes");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function bulkApproveMeasurements(ids: string[]) {
    const session = await getSession()
    if (!session?.user) return { success: false, error: 'Não autenticado' }
    const user = session.user as { id: string; role: string; companyId: string }

    try {
        await prisma.measurement.updateMany({
            where: {
                id: { in: ids },
                status: 'SUBMITTED', // Only approve submitted ones
                project: { companyId: user.companyId } // Filter by company
            },
            data: {
                status: 'APPROVED',
                approvedById: user.id
            }
        });
        revalidatePath("/dashboard/medicoes");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateMeasurement(id: string, data: z.infer<typeof UpdateSchema>) {
    const session = await getSession()
    if (!session?.user) return { success: false, error: 'Não autenticado' }
    const user = session.user as { id: string; role: string; companyId: string }

    try {
        // Verify measurement belongs to user's company
        const existing = await prisma.measurement.findUnique({
            where: { id },
            select: { project: { select: { companyId: true } } }
        })
        if (!existing || existing.project.companyId !== user.companyId) {
            return { success: false, error: 'Acesso negado' }
        }

        const _parsed = UpdateSchema.safeParse(data)

        if (!_parsed.success) return { success: false, error: _parsed.error.issues[0]?.message ?? 'Dados inválidos' }

        const validated = _parsed.data;

        const measurement = await prisma.measurement.update({
            where: { id },
            data: {
                ...validated,
                date: validated.date ? new Date(validated.date) : undefined,
            }
        });

        revalidatePath("/dashboard/medicoes");

        const serialized = {
            ...measurement,
            quantity: Number(measurement.quantity),
        };

        return { success: true, data: serialized };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteMeasurement(id: string) {
    const session = await getSession()
    if (!session?.user) return { success: false, error: 'Não autenticado' }
    const user = session.user as { id: string; role: string; companyId: string }

    // Check delete permission
    if (user.role !== "ADMIN" && !(session.user as any).canDelete) {
        return { success: false, error: 'Sem permissão para excluir' }
    }

    try {
        // Verify measurement belongs to user's company
        const existing = await prisma.measurement.findUnique({
            where: { id },
            select: { project: { select: { companyId: true } } }
        })
        if (!existing || existing.project.companyId !== user.companyId) {
            return { success: false, error: 'Acesso negado' }
        }

        await prisma.measurement.delete({
            where: { id }
        });

        revalidatePath("/dashboard/medicoes");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getMeasurementById(id: string) {
    const session = await getSession()
    if (!session?.user) return { success: false, error: 'Não autenticado' }
    const user = session.user as { id: string; role: string; companyId: string }

    try {
        const measurement = await prisma.measurement.findUnique({
            where: { id },
            include: {
                project: { select: { id: true, name: true, companyId: true } },
                employee: { select: { id: true, name: true } },
                contractItem: true,
                registeredBy: { select: { id: true, name: true } },
                approvedBy: { select: { id: true, name: true } },
            },
        })
        if (!measurement) return { success: false, error: "Medição não encontrada" }

        // Verify company access
        if (measurement.project.id && measurement.project.companyId !== user.companyId) {
            return { success: false, error: "Acesso negado" }
        }

        return {
            success: true,
            data: {
                ...measurement,
                quantity: Number(measurement.quantity),
                contractItem: measurement.contractItem ? {
                    ...measurement.contractItem,
                    unitPrice: Number(measurement.contractItem.unitPrice),
                    quantity: Number(measurement.contractItem.quantity),
                } : null,
            },
        }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
