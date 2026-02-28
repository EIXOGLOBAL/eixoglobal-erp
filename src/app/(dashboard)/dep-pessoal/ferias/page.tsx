import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, CheckCircle2, Users, Clock } from "lucide-react"
import { getVacationRequests } from "@/app/actions/vacation-actions"
import { VacationsClient } from "@/components/rh/vacations-client"

export const dynamic = 'force-dynamic'

export default async function FeriasPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const [requests, employees] = await Promise.all([
        getVacationRequests(companyId),
        prisma.employee.findMany({
            where: { companyId, status: 'ACTIVE' },
            select: { id: true, name: true, jobTitle: true },
            orderBy: { name: 'asc' },
        }),
    ])

    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const currentYearStart = new Date(now.getFullYear(), 0, 1)
    const currentYearEnd = new Date(now.getFullYear(), 11, 31)

    // KPI 1: Solicitações Pendentes
    const pendingCount = requests.filter(r => r.status === 'PENDING').length

    // KPI 2: Aprovadas no mês atual (startDate is in current month)
    const approvedThisMonth = requests.filter(r =>
        r.status === 'APPROVED' &&
        r.startDate >= currentMonthStart &&
        r.startDate <= currentMonthEnd
    ).length

    // KPI 3: Funcionários Afastados (APPROVED where startDate <= today <= endDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const onLeaveEmployeeIds = new Set(
        requests
            .filter(r =>
                r.status === 'APPROVED' &&
                r.startDate <= today &&
                r.endDate >= today
            )
            .map(r => r.employeeId)
    )
    const onLeaveCount = onLeaveEmployeeIds.size

    // KPI 4: Total de Dias no ano (APPROVED in current year)
    const totalDaysYear = requests
        .filter(r =>
            r.status === 'APPROVED' &&
            r.startDate >= currentYearStart &&
            r.startDate <= currentYearEnd
        )
        .reduce((sum, r) => sum + r.days, 0)

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Férias e Afastamentos</h2>
                <p className="text-muted-foreground">
                    Gerencie solicitações de férias, licenças e afastamentos
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Solicitações Pendentes</CardTitle>
                        <Clock className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
                        <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Aprovadas (mês atual)</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{approvedThisMonth}</div>
                        <p className="text-xs text-muted-foreground">
                            {now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Funcionários Afastados</CardTitle>
                        <Users className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{onLeaveCount}</div>
                        <p className="text-xs text-muted-foreground">Em férias/afastamento hoje</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Dias (ano)</CardTitle>
                        <CalendarDays className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">{totalDaysYear}</div>
                        <p className="text-xs text-muted-foreground">Dias aprovados em {now.getFullYear()}</p>
                    </CardContent>
                </Card>
            </div>

            <VacationsClient requests={requests} employees={employees} />
        </div>
    )
}
