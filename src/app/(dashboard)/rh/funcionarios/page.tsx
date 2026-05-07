import { getEmployees } from "@/app/actions/employee-actions"
import { getSalaryTables } from "@/app/actions/salary-table-actions"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, UserMinus, Clock } from "lucide-react"
import { EmployeesTable } from "@/components/rh/employees-table"
import { CreateFuncionarioButton } from '@/components/rh/create-funcionario-button'

export const dynamic = 'force-dynamic'

export default async function FuncionariosPage() {
    const session = await getSession()
    if (!session) {
        redirect("/login")
    }

    const companyId = session.user?.companyId
    if (!companyId) {
        redirect("/login")
    }

    const userRole = session.user?.role as string
    const canManageHR = userRole === 'ADMIN' || userRole === 'MANAGER' || !!(session.user as any)?.canManageHR

    const [employeesResult, salaryTables] = await Promise.all([
        getEmployees({ companyId }),
        getSalaryTables(companyId),
    ])

    const employees = employeesResult.data || []

    const allGrades = salaryTables.flatMap(t => t.grades.map(g => ({
        id: g.id,
        jobTitle: g.jobTitle,
        level: g.level,
        costPerHour: Number(g.costPerHour),
        baseSalary: Number(g.baseSalary),
    })))

    // KPIs
    const activeEmployees = employees.filter(e => e.status === 'ACTIVE').length
    const onLeaveEmployees = employees.filter(e => e.status === 'ON_LEAVE').length
    const inactiveEmployees = employees.filter(e => e.status === 'INACTIVE').length
    const totalCostPerHour = employees
        .filter(e => e.status === 'ACTIVE' && e.costPerHour)
        .reduce((sum, e) => sum + (e.costPerHour || 0), 0)

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Funcionários</h2>
                    <p className="text-muted-foreground">
                        Gerencie sua equipe e recursos humanos
                    </p>
                </div>
                {canManageHR && <CreateFuncionarioButton companyId={companyId} salaryGrades={allGrades} />}
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Funcionários Ativos
                        </CardTitle>
                        <UserCheck className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeEmployees}</div>
                        <p className="text-xs text-muted-foreground">
                            Trabalhando atualmente
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Afastados
                        </CardTitle>
                        <Clock className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{onLeaveEmployees}</div>
                        <p className="text-xs text-muted-foreground">
                            Em licença ou férias
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Inativos
                        </CardTitle>
                        <UserMinus className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{inactiveEmployees}</div>
                        <p className="text-xs text-muted-foreground">
                            Desligados do quadro
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Custo Total/Hora
                        </CardTitle>
                        <Users className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                            }).format(totalCostPerHour)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Soma do custo por hora da equipe ativa
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabela de Funcionários */}
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Funcionários</CardTitle>
                </CardHeader>
                <CardContent>
                    <EmployeesTable employees={employees} />
                </CardContent>
            </Card>
        </div>
    )
}
