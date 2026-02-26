import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getSupplierDetail, getSupplierFinancialHistory } from "@/app/actions/supplier-actions"
import { SupplierDetailClient } from "@/components/suppliers/supplier-detail-client"

export default async function SupplierDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const session = await getSession()
    if (!session) redirect("/login")

    const { id } = await params

    const [detailResult, financialResult] = await Promise.all([
        getSupplierDetail(id),
        getSupplierFinancialHistory(id),
    ])

    if (!detailResult.success || !detailResult.data) {
        redirect("/fornecedores")
    }

    const financialData = financialResult.success ? financialResult.data : null

    return (
        <SupplierDetailClient
            supplier={detailResult.data as any}
            financialData={financialData as any}
            companyId={session.user?.companyId ?? ""}
        />
    )
}
