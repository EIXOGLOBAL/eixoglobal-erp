'use server'

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from '@/lib/auth';

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
        const { unitPrice, ...dbData } = data; // Remove unitPrice if not needed for Measurement model

        const measurement = await prisma.measurement.create({
            data: {
                ...dbData,
                date: new Date(dbData.date),
                registeredById: user.id,
                status: 'SUBMITTED' // Default to SUBMITTED effectively acts as pending
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

export async function getMeasurements(status?: 'PENDING' | 'ALL') {
    const session = await getSession()
    if (!session?.user) return { success: false, error: 'Não autenticado' }
    const user = session.user as { id: string; role: string; companyId: string }

    try {
        const where: any = {};
        if (status === 'PENDING') {
            where.status = 'SUBMITTED';
        }
        // status 'ALL' implies no filter or filtered by user. keeping it open for now.

        const measurements = await prisma.measurement.findMany({
            where,
            orderBy: { date: 'desc' },
            include: {
                project: true,
                employee: true,
                contractItem: true
            }
        });

        // Serialize Decimals for client components
        const serialized = measurements.map(m => ({
            ...m,
            quantity: Number(m.quantity),
            contractItem: {
                ...m.contractItem,
                unitPrice: Number(m.contractItem.unitPrice)
            }
        }));

        return { success: true, data: serialized };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function approveMeasurement(id: string) {
    const session = await getSession()
    if (!session?.user) return { success: false, error: 'Não autenticado' }
    const user = session.user as { id: string; role: string; companyId: string }

    if (user.role !== 'MANAGER') {
        return { success: false, error: "Unauthorized" };
    }

    try {
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
        await prisma.measurement.update({
            where: { id },
            data: {
                status: 'REJECTED',
                rejectionReason: reason,
                approvedById: user.id
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
                status: 'SUBMITTED' // Only approve submitted ones
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
        const validated = UpdateSchema.parse(data);

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

    try {
        await prisma.measurement.delete({
            where: { id }
        });

        revalidatePath("/dashboard/medicoes");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
