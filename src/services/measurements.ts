import { prisma } from "@/lib/prisma";
import { MeasurementStatus, ProjectStatus } from "@/lib/generated/prisma";

export const measurementService = {
    /**
     * Registrar nova medição (POST /medicoes)
     * Regras:
     * 1. Projeto deve estar ativo.
     * 2. Calcula valor total (implícito no ContractItem, mas retornado para uso).
     */
    async createMeasurement(data: {
        projectId: string;
        contractItemId: string;
        quantity: number;
        employeeId?: string; // Quem executou
        registeredById: string; // Quem lançou
        date: Date;
        description?: string;
    }) {
        // 1. Validação de Projeto
        const project = await prisma.project.findUnique({
            where: { id: data.projectId },
            select: { status: true }
        });

        if (!project) throw new Error("Projeto não encontrado.");
        if (project.status === 'CANCELLED' || project.status === 'COMPLETED') {
            throw new Error("Não é possível registrar medições em projetos cancelados ou concluídos.");
        }

        // 2. Validação de Item de Contrato
        const item = await prisma.contractItem.findUnique({
            where: { id: data.contractItemId },
        });
        if (!item) throw new Error("Item de contrato não encontrado.");

        // (Opcional) Validar se a quantidade excede o contrato?
        // Por enquanto deixamos passar, mas seria uma warning.

        // 3. Criação
        const measurement = await prisma.measurement.create({
            data: {
                projectId: data.projectId,
                contractItemId: data.contractItemId,
                quantity: data.quantity,
                date: data.date,
                description: data.description,
                employeeId: data.employeeId,
                registeredById: data.registeredById,
                status: MeasurementStatus.SUBMITTED, // Default to SUBMITTED (Pending Approval) as per rule
            },
            include: {
                contractItem: true // Include to get unit price and calculate total
            }
        });

        // Retorna com valor calculado e context
        const totalValue = Number(measurement.quantity) * Number(measurement.contractItem.unitPrice);

        return {
            ...measurement,
            calculatedTotalValue: totalValue
        };
    },

    /**
     * Alterar Status (PATCH /medicoes/{id}/status)
     * Regras:
     * 1. Apenas GESTOR pode aprovar (validado no Controller/Action).
     * 2. Não pode editar se já estiver BILLED/PAID.
     */
    async updateStatus(
        id: string,
        newStatus: MeasurementStatus,
        userId: string // Aprovador
    ) {
        const current = await prisma.measurement.findUnique({
            where: { id },
        });

        if (!current) throw new Error("Medição não encontrada.");

        // Constraint: Immutability
        if (current.status === 'BILLED' || current.status === 'PAID') {
            throw new Error("Não é possível alterar uma medição já faturada ou paga.");
        }

        const updateData: any = { status: newStatus };

        if (newStatus === 'APPROVED') {
            updateData.approvedById = userId;
        }

        return await prisma.measurement.update({
            where: { id },
            data: updateData,
        });
    },

    /**
     * Listar Pendentes (GET /medicoes/pendentes)
     */
    async listPending(companyId: string, projectId?: string) {
        return await prisma.measurement.findMany({
            where: {
                project: { companyId }, // Multi-tenancy check
                status: 'SUBMITTED', // Pending approval
                ...(projectId && { projectId }),
            },
            include: {
                project: { select: { name: true } },
                employee: { select: { name: true } },
                contractItem: true,
            },
            orderBy: { date: 'desc' }
        });
    }
};
