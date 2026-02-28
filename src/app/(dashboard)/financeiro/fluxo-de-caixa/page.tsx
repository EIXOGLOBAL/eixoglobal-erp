import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { generateCashflowProjection, getFinancialKPIs } from "@/lib/financial-reports"
import { CashflowProjectionClient } from "@/components/financeiro/cashflow-projection-client"

export const dynamic = 'force-dynamic'

export default async function FluxoDeCaixaPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const defaultMonths = 6

    const [projection, kpis] = await Promise.all([
        generateCashflowProjection(companyId, defaultMonths),
        getFinancialKPIs(companyId),
    ])

    return (
        <div className="flex-1 p-4 md:p-8 pt-6">
            <CashflowProjectionClient
                initialData={projection}
                initialMonths={defaultMonths}
                burnRate={kpis.burnRate}
                cashRunway={kpis.cashRunway}
            />
        </div>
    )
}
