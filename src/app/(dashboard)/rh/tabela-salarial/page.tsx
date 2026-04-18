import { getSalaryTables } from "@/app/actions/salary-table-actions"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { SalaryTableDialog } from "@/components/rh/salary-table-dialog"
import { SalaryGradeDialog } from "@/components/rh/salary-grade-dialog"
import { DeleteSalaryTableButton, DeleteSalaryGradeButton } from "@/components/rh/salary-table-actions-client"
import { SalaryTableExportButton } from "@/components/rh/salary-table-export-button"
import { LayoutList, Award, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/formatters"

export const dynamic = 'force-dynamic'

const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default async function TabelaSalarialPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const tables = await getSalaryTables(companyId)

    // KPIs
    const activeTables = tables.filter(t => t.isActive).length
    const totalGrades = tables.reduce((sum, t) => sum + t.grades.length, 0)

    let mostExpensiveGrade: { jobTitle: string; level: string | null; costPerHour: number } | null = null
    for (const table of tables) {
        for (const g of table.grades) {
            const cph = Number(g.costPerHour)
            if (!mostExpensiveGrade || cph > mostExpensiveGrade.costPerHour) {
                mostExpensiveGrade = { jobTitle: g.jobTitle, level: g.level, costPerHour: cph }
            }
        }
    }

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Tabela Salarial</h2>
                    <p className="text-muted-foreground">
                        Gerencie as tabelas e grades salariais da empresa
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <SalaryTableExportButton tables={tables.map(t => ({
                        name: t.name,
                        isActive: t.isActive,
                        grades: t.grades.map(g => ({
                            jobTitle: g.jobTitle,
                            level: g.level,
                            baseSalary: Number(g.baseSalary),
                            benefits: Number(g.benefits),
                            taxRate: Number(g.taxRate),
                            costPerHour: Number(g.costPerHour),
                        })),
                    }))} />
                    <SalaryTableDialog companyId={companyId} />
                </div>
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tabelas Ativas</CardTitle>
                        <LayoutList className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeTables}</div>
                        <p className="text-xs text-muted-foreground">de {tables.length} tabelas cadastradas</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Grades</CardTitle>
                        <Award className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalGrades}</div>
                        <p className="text-xs text-muted-foreground">Cargos/níveis cadastrados</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cargo Mais Caro</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {mostExpensiveGrade ? (
                            <>
                                <div className="text-xl font-bold">{fmt(mostExpensiveGrade.costPerHour)}<span className="text-xs font-normal text-muted-foreground">/h</span></div>
                                <p className="text-xs text-muted-foreground">
                                    {mostExpensiveGrade.jobTitle}{mostExpensiveGrade.level ? ` – ${mostExpensiveGrade.level}` : ''}
                                </p>
                            </>
                        ) : (
                            <div className="text-sm text-muted-foreground">Nenhum grade cadastrado</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Tables list */}
            {tables.length === 0 ? (
                <Card>
                    <CardContent className="text-center py-12 text-muted-foreground">
                        Nenhuma tabela salarial cadastrada. Crie a primeira tabela.
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {tables.map((table) => (
                        <Card key={table.id}>
                            <CardHeader>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-lg">{table.name}</CardTitle>
                                            <Badge variant={table.isActive ? "default" : "secondary"}>
                                                {table.isActive ? "Ativo" : "Inativo"}
                                            </Badge>
                                        </div>
                                        <CardDescription className="mt-1">
                                            Vigência: {formatDate(table.effectiveDate)}
                                            {table.description && ` — ${table.description}`}
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <SalaryTableDialog
                                            companyId={companyId}
                                            salaryTable={{
                                                id: table.id,
                                                name: table.name,
                                                description: table.description,
                                                effectiveDate: table.effectiveDate,
                                                isActive: table.isActive,
                                            }}
                                            trigger={
                                                <Button size="sm" variant="outline">Editar</Button>
                                            }
                                        />
                                        <DeleteSalaryTableButton id={table.id} name={table.name} />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {table.grades.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Cargo</TableHead>
                                                <TableHead>Nível</TableHead>
                                                <TableHead className="text-right">Salário Base</TableHead>
                                                <TableHead className="text-right">Benefícios</TableHead>
                                                <TableHead className="text-right">Encargos %</TableHead>
                                                <TableHead className="text-right">Custo/Hora</TableHead>
                                                <TableHead className="w-[100px]">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {table.grades.map((grade) => (
                                                <TableRow key={grade.id}>
                                                    <TableCell className="font-medium">{grade.jobTitle}</TableCell>
                                                    <TableCell>{grade.level || '—'}</TableCell>
                                                    <TableCell className="text-right">{fmt(Number(grade.baseSalary))}</TableCell>
                                                    <TableCell className="text-right">{fmt(Number(grade.benefits))}</TableCell>
                                                    <TableCell className="text-right">{Number(grade.taxRate).toFixed(1)}%</TableCell>
                                                    <TableCell className="text-right font-semibold">{fmt(Number(grade.costPerHour))}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1">
                                                            <SalaryGradeDialog
                                                                tableId={table.id}
                                                                grade={{
                                                                    id: grade.id,
                                                                    jobTitle: grade.jobTitle,
                                                                    level: grade.level,
                                                                    baseSalary: Number(grade.baseSalary),
                                                                    costPerHour: Number(grade.costPerHour),
                                                                    hoursPerMonth: grade.hoursPerMonth,
                                                                    benefits: Number(grade.benefits),
                                                                    taxRate: Number(grade.taxRate),
                                                                }}
                                                                trigger={
                                                                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Editar">
                                                                        <span className="text-xs">✎</span>
                                                                    </Button>
                                                                }
                                                            />
                                                            <DeleteSalaryGradeButton
                                                                id={grade.id}
                                                                label={`${grade.jobTitle}${grade.level ? ' – ' + grade.level : ''}`}
                                                            />
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        Nenhum grade cadastrado nesta tabela.
                                    </p>
                                )}

                                <div className="mt-4">
                                    <SalaryGradeDialog tableId={table.id} />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
