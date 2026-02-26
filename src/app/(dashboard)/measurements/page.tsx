import { getMeasurementBulletins } from "@/app/actions/bulletin-actions"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { CreateBulletinDialog } from "@/components/bulletins/create-bulletin-dialog"
import { BulletinsTable } from "@/components/bulletins/bulletins-table"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { FileText, CheckCircle2, Clock, XCircle } from "lucide-react"

export default async function MeasurementsPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const bulletinsRes = await getMeasurementBulletins(undefined, companyId)
    const bulletins = bulletinsRes.success ? (bulletinsRes.data || []) : []

    // Get projects and contracts for the dialog (filtered by company)
    const projects = await prisma.project.findMany({
        where: { companyId },
        select: {
            id: true,
            name: true,
            contracts: {
                select: {
                    id: true,
                    identifier: true,
                }
            }
        },
        orderBy: { name: 'asc' }
    })

    // Calculate KPIs
    const totalBulletins = bulletins.length
    const draftBulletins = bulletins.filter(b => b.status === 'DRAFT').length
    const pendingBulletins = bulletins.filter(b => b.status === 'PENDING_APPROVAL').length
    const approvedBulletins = bulletins.filter(b => b.status === 'APPROVED').length
    const totalValue = bulletins
        .filter(b => b.status === 'APPROVED')
        .reduce((sum, b) => sum + Number(b.totalValue), 0)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Boletins de Medição</h1>
                    <p className="text-muted-foreground">
                        Gestão profissional de medições com workflow de aprovação
                    </p>
                </div>
                <CreateBulletinDialog projects={projects} userId={session.user?.id || ''} />
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total de Boletins
                        </CardTitle>
                        <FileText className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalBulletins}</div>
                        <p className="text-xs text-muted-foreground">
                            {draftBulletins} em rascunho
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Pendentes
                        </CardTitle>
                        <Clock className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingBulletins}</div>
                        <p className="text-xs text-muted-foreground">
                            Aguardando aprovação
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Aprovados
                        </CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{approvedBulletins}</div>
                        <p className="text-xs text-muted-foreground">
                            Prontos para faturamento
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Valor Aprovado
                        </CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                                minimumFractionDigits: 0,
                            }).format(totalValue)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Total medido e aprovado
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Bulletins Table */}
            <BulletinsTable data={bulletins} userId={session?.user?.id || ''} />
        </div>
    )
}
