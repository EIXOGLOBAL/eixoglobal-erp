import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap, CalendarClock, PlayCircle, AlertTriangle } from "lucide-react"
import { TrainingsClient } from "@/components/rh/trainings-client"

export const dynamic = 'force-dynamic'

export default async function TreinamentosPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const trainings = await prisma.training.findMany({
        where: { companyId },
        include: {
            _count: {
                select: { participants: true },
            },
        },
        orderBy: { startDate: 'desc' },
    })

    const employees = await prisma.employee.findMany({
        where: { companyId, status: 'ACTIVE' },
        select: { id: true, name: true, jobTitle: true },
        orderBy: { name: 'asc' },
    })

    // KPIs
    const totalTrainings = trainings.length
    const inProgressTrainings = trainings.filter(t => t.status === 'IN_PROGRESS').length
    const scheduledTrainings = trainings.filter(t => t.status === 'SCHEDULED').length
    const now = new Date()
    const expiredNRs = trainings.filter(t => {
        if (t.type !== 'NR') return false
        const endDate = t.endDate ?? t.startDate
        return endDate < now && t.status !== 'CANCELLED'
    }).length

    // Serialize for client component
    const serializedTrainings = trainings.map(t => ({
        ...t,
        hours: Number(t.hours),
        cost: t.cost ? Number(t.cost) : null,
        startDate: t.startDate.toISOString(),
        endDate: t.endDate ? t.endDate.toISOString() : null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
    }))

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Treinamentos</h2>
                <p className="text-muted-foreground">
                    Gestão de treinamentos, certificações e desenvolvimento de equipe
                </p>
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Treinamentos</CardTitle>
                        <GraduationCap className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalTrainings}</div>
                        <p className="text-xs text-muted-foreground">Todos os treinamentos</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
                        <PlayCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{inProgressTrainings}</div>
                        <p className="text-xs text-muted-foreground">Treinamentos ativos agora</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Agendados</CardTitle>
                        <CalendarClock className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{scheduledTrainings}</div>
                        <p className="text-xs text-muted-foreground">Aguardando realização</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">NRs Vencidas</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{expiredNRs}</div>
                        <p className="text-xs text-muted-foreground">Normas regulamentadoras expiradas</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main content */}
            <TrainingsClient
                companyId={companyId}
                trainings={serializedTrainings}
                employees={employees}
            />
        </div>
    )
}
