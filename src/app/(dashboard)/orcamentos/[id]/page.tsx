import { getSession } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getBudgetWithMeasured } from "@/app/actions/budget-actions"
import { getDefaultBDIConfig } from "@/app/actions/bdi-config-actions"
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
    const result = await getBudgetWithMeasured(id)

    if (!result.success || !result.data) {
        notFound()
    }

    const budget = result.data

    // Ensure the budget belongs to the user's company
    if (budget.companyId !== companyId) {
        redirect("/orcamentos")
    }

    const bdiResult = await getDefaultBDIConfig(companyId)
    const bdiConfig = bdiResult.success ? bdiResult.data : null
    const bdiInfo = bdiConfig ? {
        name: bdiConfig.name,
        percentage: toNumber(bdiConfig.percentage),
    } : null

    return <BudgetDetailClient budget={budget} companyId={companyId} bdiInfo={bdiInfo} />
}
