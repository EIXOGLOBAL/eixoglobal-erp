import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { generateDRE } from "@/lib/financial-reports"
import { DREClient } from "@/components/financeiro/dre-client"

export default async function DrePage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    const report = await generateDRE(companyId, year, month)

    return (
        <div className="flex-1 p-4 md:p-8 pt-6">
            <DREClient initialData={report} />
        </div>
    )
}
