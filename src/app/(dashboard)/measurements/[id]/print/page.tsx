import { getBulletinById } from "@/app/actions/bulletin-actions"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { PrintBulletinClient } from "@/components/bulletins/print-bulletin-client"

export const dynamic = 'force-dynamic'

export default async function PrintBulletinPage({ params }: { params: Promise<{ id: string }> }) {
        const { id } = await params
const session = await getSession()
    if (!session) redirect("/login")

    const result = await getBulletinById(id)
    if (!result.success || !result.data) notFound()

    const bulletin = result.data

    // Buscar info da empresa do projeto
    const project = await prisma.project.findUnique({
        where: { id: bulletin.project.id },
        include: { company: true }
    })

    const company = project?.company ?? null

    return (
        <PrintBulletinClient
            bulletin={{
                id: bulletin.id,
                number: bulletin.number,
                referenceMonth: bulletin.referenceMonth,
                periodStart: bulletin.periodStart,
                periodEnd: bulletin.periodEnd,
                totalValue: bulletin.totalValue,
                status: bulletin.status,
                rejectionReason: bulletin.rejectionReason ?? null,
                submittedAt: bulletin.submittedAt ?? null,
                approvedByEngineerAt: bulletin.approvedByEngineerAt ?? null,
                createdAt: bulletin.createdAt,
                project: {
                    id: bulletin.project.id,
                    name: bulletin.project.name,
                },
                contract: {
                    id: bulletin.contract.id,
                    identifier: bulletin.contract.identifier,
                    value: bulletin.contract.value ?? null,
                },
                items: bulletin.items.map(item => ({
                    id: item.id,
                    itemCode: item.itemCode ?? null,
                    description: item.description,
                    unit: item.unit,
                    unitPrice: item.unitPrice,
                    contractedQuantity: item.contractedQuantity,
                    previousMeasured: item.previousMeasured,
                    currentMeasured: item.currentMeasured,
                    accumulatedMeasured: item.accumulatedMeasured,
                    balanceQuantity: item.balanceQuantity,
                    currentValue: item.currentValue,
                    accumulatedValue: item.accumulatedValue,
                    percentageExecuted: item.percentageExecuted,
                    contractItem: item.contractItem ? {
                        id: item.contractItem.id,
                        description: item.contractItem.description,
                        unit: item.contractItem.unit,
                        quantity: item.contractItem.quantity,
                        unitPrice: item.contractItem.unitPrice,
                    } : null,
                })),
                comments: bulletin.comments.map(c => ({
                    id: c.id,
                    text: c.text,
                    commentType: c.commentType,
                    createdAt: c.createdAt,
                    author: c.author ? { name: c.author.name } : null,
                })),
                createdBy: bulletin.createdBy ? { name: bulletin.createdBy.name } : null,
                engineer: bulletin.engineer ? { name: bulletin.engineer.name } : null,
                manager: bulletin.manager ? { name: bulletin.manager.name } : null,
            }}
            company={company}
        />
    )
}
