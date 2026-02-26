import { getSession } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getBudgetById } from "@/app/actions/budget-actions"
import { BudgetDetailClient } from "@/components/orcamentos/budget-detail-client"

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

    return <BudgetDetailClient budget={budget} companyId={companyId} />
}
