import { getProjectById } from "@/app/actions/project-actions"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { PrintProjectClient } from "@/components/projects/print-project-client"

export const dynamic = 'force-dynamic'

export default async function PrintProjectPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await getSession()
    if (!session) redirect("/login")

    const result = await getProjectById(id)
    if (!result.success || !result.data) notFound()

    const project = result.data

    // Buscar empresa completa para cabecalho
    const company = await prisma.company.findUnique({
        where: { id: project.companyId },
        select: {
            id: true,
            name: true,
            cnpj: true,
            tradeName: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
        },
    })

    // Buscar tarefas do cronograma
    const tasks = await prisma.projectTask.findMany({
        where: { projectId: id },
        select: {
            id: true,
            name: true,
            phase: true,
            startDate: true,
            endDate: true,
            percentDone: true,
            status: true,
            isMilestone: true,
        },
        orderBy: [
            { order: 'asc' },
            { startDate: 'asc' },
        ],
    })

    return (
        <PrintProjectClient
            project={{
                id: project.id,
                code: project.code ?? null,
                name: project.name,
                description: project.description ?? null,
                location: project.location ?? null,
                startDate: project.startDate,
                endDate: project.endDate ?? null,
                budget: project.budget,
                status: project.status,
                company: company ? {
                    id: company.id,
                    name: company.name,
                    cnpj: company.cnpj,
                    tradeName: company.tradeName ?? null,
                    address: company.address ?? null,
                    city: company.city ?? null,
                    state: company.state ?? null,
                } : null,
                client: project.client ? {
                    id: project.client.id,
                    name: project.client.displayName,
                    document: project.client.cnpj ?? project.client.cpf ?? null,
                    email: project.client.email ?? null,
                    phone: project.client.phone ?? null,
                } : null,
                contracts: project.contracts.map(c => ({
                    id: c.id,
                    identifier: c.identifier,
                    description: c.description ?? null,
                    value: c.value ? Number(c.value) : null,
                    startDate: c.startDate,
                    endDate: c.endDate ?? null,
                    status: c.status,
                    items: c.items.map(item => ({
                        id: item.id,
                        description: item.description,
                        unit: item.unit,
                        quantity: Number(item.quantity),
                        unitPrice: Number(item.unitPrice),
                    })),
                })),
                measurements: project.measurements.map(m => ({
                    id: m.id,
                    date: m.date,
                    quantity: Number(m.quantity),
                    description: m.description ?? null,
                    status: m.status,
                    contractItem: m.contractItem ? {
                        id: m.contractItem.id,
                        description: m.contractItem.description,
                        unit: m.contractItem.unit,
                        quantity: Number(m.contractItem.quantity),
                        unitPrice: Number(m.contractItem.unitPrice),
                        contractId: m.contractItem.contractId,
                    } : null,
                    employee: m.employee ? {
                        id: m.employee.id,
                        name: m.employee.name,
                        jobTitle: m.employee.jobTitle,
                    } : null,
                })),
                allocations: project.allocations.map(a => ({
                    id: a.id,
                    startDate: a.startDate,
                    endDate: a.endDate ?? null,
                    employee: {
                        id: a.employee.id,
                        name: a.employee.name,
                        jobTitle: a.employee.jobTitle,
                        status: a.employee.status,
                    },
                })),
                tasks: tasks.map(t => ({
                    id: t.id,
                    name: t.name,
                    phase: t.phase ?? null,
                    startDate: t.startDate,
                    endDate: t.endDate,
                    percentDone: t.percentDone,
                    status: t.status,
                    isMilestone: t.isMilestone,
                })),
                measurementsCount: project._count.measurements,
                contractsCount: project._count.contracts,
            }}
        />
    )
}
