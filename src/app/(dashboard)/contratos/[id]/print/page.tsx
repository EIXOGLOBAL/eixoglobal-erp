import { getContractById } from "@/app/actions/contract-actions"
import { getSession } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"
import { PrintContractClient } from "@/components/contracts/print-contract-client"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export default async function PrintContractPage({ params }: { params: Promise<{ id: string }> }) {
        const { id } = await params
const session = await getSession()
    if (!session) redirect("/login")

    const result = await getContractById(id)
    if (!result.success || !result.data) notFound()

    const contract = result.data

    // Get the company via the project
    const project = await prisma.project.findUnique({
        where: { id: contract.project.id },
        include: { company: true }
    })

    const company = project?.company ?? null

    return (
        <PrintContractClient
            contract={{
                id: contract.id,
                identifier: contract.identifier,
                description: contract.description ?? null,
                value: contract.value ?? null,
                startDate: contract.startDate,
                endDate: contract.endDate ?? null,
                status: contract.status,
                companyId: contract.companyId ?? null,
                createdAt: contract.createdAt,
                updatedAt: contract.updatedAt,
                project: {
                    id: contract.project.id,
                    name: contract.project.name,
                },
                contractor: contract.contractor
                    ? {
                        id: contract.contractor.id,
                        name: contract.contractor.name,
                        document: contract.contractor.document ?? null,
                    }
                    : null,
                items: (contract.items ?? []).map(item => ({
                    id: item.id,
                    description: item.description,
                    unit: item.unit,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    measuredQuantity: item.measuredQuantity,
                })),
                amendments: (contract.amendments ?? []).map(a => ({
                    id: a.id,
                    number: a.number,
                    description: a.description,
                    type: a.type as 'VALUE_CHANGE' | 'DEADLINE_CHANGE' | 'SCOPE_CHANGE' | 'MIXED',
                    oldValue: a.oldValue ?? null,
                    newValue: a.newValue ?? null,
                    oldEndDate: a.oldEndDate ?? null,
                    newEndDate: a.newEndDate ?? null,
                    justification: a.justification,
                    createdAt: a.createdAt,
                })),
                bulletins: (contract.bulletins ?? []).map(b => ({
                    id: b.id,
                    number: b.number,
                    referenceMonth: b.referenceMonth,
                    status: b.status,
                    totalValue: b.totalValue,
                })),
            }}
            company={company}
        />
    )
}
