import { getSession } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getBudgetById } from "@/app/actions/budget-actions"
import { BudgetDetailClient } from "@/components/orcamentos/budget-detail-client"
import { toNumber } from "@/lib/formatters"

export const dynamic = 'force-dynamic'

interface BudgetPageProps {
    params: Promise<{ id: string }>
}

export default async function BudgetDetailPage({ params }: BudgetPageProps) {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const { id } = await params
    const result = await getBudgetById(id)

    if (!result.success || !result.data) {
        notFound()
    }

    const budget = result.data

    // Ensure the budget belongs to the user's company
    if (budget.companyId !== companyId) {
        redirect("/orcamentos")
    }

    // Converter Decimal para number para Client Component
    const serializedBudget = {
        ...budget,
        totalValue: toNumber(budget.totalValue),
        items: budget.items.map(item => ({
            ...item,
            quantity: toNumber(item.quantity),
            unitPrice: toNumber(item.unitPrice),
            totalPrice: toNumber(item.totalPrice),
        })),
    }

    return <BudgetDetailClient budget={serializedBudget} companyId={companyId} />
}
