import { getEmployeeById } from "@/app/actions/employee-actions"
import { getSalaryTables } from "@/app/actions/salary-table-actions"
import { getSession } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { EmployeeDialog } from "@/components/rh/employee-dialog"
import { EmployeeAvatarUpload } from "@/components/ui/employee-avatar-upload"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    ArrowLeft,
    User,
    DollarSign,
    FolderKanban,
    Wrench,
    TrendingUp,
    CalendarDays,
    Heart,
    Clock,
    Gift,
} from "lucide-react"
import { SalaryHistoryCard } from "@/components/rh/salary-history"
import { MatriculaEditor } from "@/components/rh/matricula-editor"
import { EmployeeBenefits } from "@/components/rh/employee-benefits"

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    ACTIVE: "default",
    INACTIVE: "destructive",
    ON_LEAVE: "outline",
    BLOCKED: "secondary",
}

const statusLabels: Record<string, string> = {
    ACTIVE: "Ativo",
    INACTIVE: "Inativo",
    ON_LEAVE: "Licença",
    BLOCKED: "Bloqueado",
}

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
        const { id } = await params
const session = await getSession()
    if (!session) redirect("/login")

    const employee = await getEmployeeById(id)
    if (!employee) notFound()

    const companyId = session.user?.companyId || ''
    const skills: string[] = JSON.parse(employee.skills || '[]')

    const salaryTables = await getSalaryTables(companyId)
    const allGrades = salaryTables.flatMap(t => t.grades.map(g => ({
        id: g.id,
        jobTitle: g.jobTitle,
        level: g.level,
        costPerHour: Number(g.costPerHour),
        baseSalary: Number(g.baseSalary),
    })))

    // Calculate salary estimate
    const hoursPerMonth = employee.hoursPerMonth ?? 220
    const monthlySalaryDisplay = employee.monthlySalary
        || (employee.costPerHour ? employee.costPerHour * hoursPerMonth : 0)

    // Overtime rates
    const costPerHour = employee.costPerHour ?? 0
    const STANDARD_OT = [50, 60, 70, 100]
    const customOtRates: number[] = (() => {
        try { return JSON.parse(employee.overtimeRates ?? '[]') } catch { return [] }
    })()

    const activeAllocations = employee.allocations.filter(a => !a.endDate || new Date(a.endDate) >= new Date())

    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
    const fmtDate = (d: Date | null | undefined) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

    // Benefits calculations
    const vtMonthly = employee.valeTransporte && employee.vtDailyValue
        ? employee.vtDailyValue * 22
        : 0
    const valeAlim = employee.valeAlimentacao || 0
    const planoSaude = employee.planoSaude || 0
    const outros = employee.outrosBeneficios || 0
    const totalBenefits = vtMonthly + valeAlim + planoSaude + outros

    // Custo total: salário + benefícios + encargos (via grade taxRate ou 0)
    const taxRate = employee.salaryGrade?.taxRate ?? 0
    const salaryBase = employee.monthlySalary || 0
    const totalCost = salaryBase + totalBenefits + (salaryBase * taxRate / 100)

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/rh/funcionarios">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <MatriculaEditor employeeId={employee.id} matricula={employee.matricula ?? null} />
                        <h1 className="text-3xl font-bold tracking-tight">{employee.name}</h1>
                    </div>
                    <p className="text-muted-foreground">{employee.jobTitle}</p>
                </div>
                <Badge variant={statusVariants[employee.status]}>
                    {statusLabels[employee.status]}
                </Badge>
                <EmployeeDialog
                    companyId={companyId}
                    salaryGrades={allGrades}
                    employee={{
                        id: employee.id,
                        name: employee.name,
                        jobTitle: employee.jobTitle,
                        document: employee.document,
                        status: employee.status as 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'BLOCKED',
                        skills: employee.skills,
                        costPerHour: employee.costPerHour,
                        companyId,
                        salaryGradeId: employee.salaryGradeId,
                        admissionDate: employee.admissionDate,
                        leaveDate: employee.leaveDate,
                        terminationDate: employee.terminationDate,
                        monthlySalary: employee.monthlySalary,
                        hoursPerMonth: employee.hoursPerMonth,
                        overtimeRates: employee.overtimeRates,
                        housed: employee.housed,
                        valeTransporte: employee.valeTransporte,
                        vtDailyValue: employee.vtDailyValue,
                        valeAlimentacao: employee.valeAlimentacao,
                        planoSaude: employee.planoSaude,
                        outrosBeneficios: employee.outrosBeneficios,
                    }}
                />
            </div>

            {/* Avatar + Info Cards */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="shrink-0">
                    <EmployeeAvatarUpload
                        employeeId={employee.id}
                        currentAvatarUrl={employee.avatarUrl}
                        name={employee.name}
                        size="lg"
                        editable={true}
                    />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 flex-1 w-full">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">CPF</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-medium font-mono">
                            {employee.document || '—'}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Custo / Hora</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">
                            {employee.costPerHour ? fmt(employee.costPerHour) : '—'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {monthlySalaryDisplay > 0 ? `~${fmt(monthlySalaryDisplay)}/mês` : 'Não definido'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Projetos</CardTitle>
                        <FolderKanban className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">{employee._count.allocations}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {activeAllocations.length} ativo{activeAllocations.length !== 1 ? 's' : ''}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Habilidades</CardTitle>
                        <Wrench className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">{skills.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Competências cadastradas
                        </p>
                    </CardContent>
                </Card>
                </div>
            </div>

            {/* Informações Contratuais e Benefícios */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5" />
                            Informações Contratuais
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <span className="text-muted-foreground">Admissão:</span>
                            <span className="font-medium">{fmtDate(employee.admissionDate)}</span>

                            <span className="text-muted-foreground">Afastamento:</span>
                            <span className="font-medium">{fmtDate(employee.leaveDate)}</span>

                            <span className="text-muted-foreground">Demissão:</span>
                            <span className="font-medium">{fmtDate(employee.terminationDate)}</span>

                            <span className="text-muted-foreground">Salário Mensal:</span>
                            <span className="font-medium">
                                {employee.monthlySalary ? fmt(employee.monthlySalary) : '—'}
                            </span>

                            <span className="text-muted-foreground">Horas/Mês:</span>
                            <span className="font-medium">{hoursPerMonth}h</span>

                            <span className="text-muted-foreground">Valor/Hora:</span>
                            <span className="font-medium">
                                {costPerHour ? fmt(costPerHour) : '—'}
                            </span>

                            <span className="text-muted-foreground">Alojado:</span>
                            <span>
                                <Badge variant={employee.housed ? "default" : "secondary"}>
                                    {employee.housed ? 'Sim' : 'Não'}
                                </Badge>
                            </span>
                        </div>

                        {employee.salaryGrade && (
                            <div className="mt-4 pt-3 border-t">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Grade Salarial</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <span className="text-muted-foreground">Tabela:</span>
                                    <span className="font-medium">{employee.salaryGrade.table.name}</span>

                                    <span className="text-muted-foreground">Cargo:</span>
                                    <span className="font-medium">{employee.salaryGrade.jobTitle}</span>

                                    {employee.salaryGrade.level && (
                                        <>
                                            <span className="text-muted-foreground">Nível:</span>
                                            <span className="font-medium">{employee.salaryGrade.level}</span>
                                        </>
                                    )}

                                    <span className="text-muted-foreground">Custo/Hora:</span>
                                    <span className="font-medium">{fmt(employee.salaryGrade.costPerHour)}</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Heart className="h-5 w-5" />
                            Benefícios
                        </CardTitle>
                        <CardDescription>Benefícios mensais estimados</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <span className="text-muted-foreground">Vale Transporte:</span>
                            <span className="font-medium">
                                {employee.valeTransporte
                                    ? `${fmt(vtMonthly)}/mês (${employee.vtDailyValue ? fmt(employee.vtDailyValue) : '—'}/dia × 22 dias)`
                                    : 'Não'}
                            </span>

                            <span className="text-muted-foreground">Vale Alimentação:</span>
                            <span className="font-medium">
                                {employee.valeAlimentacao ? fmt(employee.valeAlimentacao) : '—'}
                            </span>

                            <span className="text-muted-foreground">Plano de Saúde:</span>
                            <span className="font-medium">
                                {employee.planoSaude ? fmt(employee.planoSaude) : '—'}
                            </span>

                            <span className="text-muted-foreground">Outros Benefícios:</span>
                            <span className="font-medium">
                                {employee.outrosBeneficios ? fmt(employee.outrosBeneficios) : '—'}
                            </span>
                        </div>

                        <div className="pt-3 border-t space-y-2">
                            <div className="flex justify-between text-sm font-semibold">
                                <span>Total de Benefícios:</span>
                                <span className="text-green-700 dark:text-green-400">{fmt(totalBenefits)}/mês</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold">
                                <span>Custo Total do Funcionário:</span>
                                <span className="text-primary">{fmt(totalCost)}/mês</span>
                            </div>
                            {taxRate > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Inclui {taxRate}% de encargos trabalhistas conforme grade salarial
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Overtime Card */}
            {costPerHour > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-orange-500" />
                            Horas Extras — Base: {fmt(costPerHour)}/h ({hoursPerMonth}h/mês)
                        </CardTitle>
                        <CardDescription>Valores calculados automaticamente sobre o custo/hora</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3">
                            {[...STANDARD_OT, ...customOtRates].map(pct => (
                                <div key={pct} className="flex flex-col items-center rounded-lg border px-4 py-3 text-center min-w-[90px]">
                                    <span className="text-xs text-muted-foreground font-medium">+{pct}%</span>
                                    <span className="text-lg font-bold mt-0.5">
                                        {fmt(costPerHour * (1 + pct / 100))}
                                    </span>
                                    <span className="text-xs text-muted-foreground">/hora</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tabs */}
            <Tabs defaultValue="allocations" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="allocations">Alocações em Projetos</TabsTrigger>
                    <TabsTrigger value="variable-benefits">
                        <Gift className="h-4 w-4 mr-1.5" />
                        Benefícios Variáveis ({employee.variableBenefits?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="skills">Habilidades</TabsTrigger>
                    <TabsTrigger value="salary-history">
                        <TrendingUp className="h-4 w-4 mr-1.5" />
                        Histórico Salarial
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="allocations">
                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Alocações</CardTitle>
                            <CardDescription>Projetos aos quais este funcionário foi alocado</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {employee.allocations.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Projeto</TableHead>
                                            <TableHead>Início</TableHead>
                                            <TableHead>Fim</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {employee.allocations.map((allocation) => {
                                            const isActive = !allocation.endDate || new Date(allocation.endDate) >= new Date()
                                            return (
                                                <TableRow key={allocation.id}>
                                                    <TableCell className="font-medium">
                                                        <Link
                                                            href={`/projects/${allocation.project.id}`}
                                                            className="text-blue-600 hover:underline"
                                                        >
                                                            {allocation.project.name}
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell>
                                                        {new Date(allocation.startDate).toLocaleDateString('pt-BR')}
                                                    </TableCell>
                                                    <TableCell>
                                                        {allocation.endDate
                                                            ? new Date(allocation.endDate).toLocaleDateString('pt-BR')
                                                            : '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={isActive ? 'default' : 'secondary'}>
                                                            {isActive ? 'Ativo' : 'Encerrado'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    Nenhuma alocação registrada ainda.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="variable-benefits">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Gift className="h-5 w-5" />
                                Benefícios Variáveis
                            </CardTitle>
                            <CardDescription>
                                Produção, gratificação, ajuda de custo, diárias e outros pagamentos mensais específicos deste colaborador
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <EmployeeBenefits
                                employeeId={employee.id}
                                benefits={employee.variableBenefits || []}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="skills">
                    <Card>
                        <CardHeader>
                            <CardTitle>Habilidades e Competências</CardTitle>
                            <CardDescription>Competências técnicas do funcionário</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {skills.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {skills.map((skill, i) => (
                                        <Badge key={i} variant="secondary" className="text-sm py-1 px-3">
                                            {skill}
                                        </Badge>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    Nenhuma habilidade cadastrada.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="salary-history">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Histórico Salarial
                            </CardTitle>
                            <CardDescription>
                                Registro de alterações no custo por hora do funcionário
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SalaryHistoryCard history={employee.salaryHistory} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
