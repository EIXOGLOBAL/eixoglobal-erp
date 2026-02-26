import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PayrollExportButton } from "@/components/rh/payroll-export-button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ArrowLeft, DollarSign, Users, TrendingUp, Calendar } from "lucide-react"

// ---------------------------------------------------------------------------
// Brazilian Payroll Calculation Helpers
// INSS: Portaria Interministerial MPS/MF nº 13, de 09/01/2026
// IRRF: Lei nº 15.270, de 26/11/2025 (vigência jan/2026)
// ---------------------------------------------------------------------------

function calcINSS(salario: number): number {
    // Tabela progressiva INSS 2026 — salário mínimo R$ 1.621,00 | teto R$ 8.475,55
    const faixas = [
        { ate: 1621.00, aliq: 0.075 },
        { ate: 2902.84, aliq: 0.09  },
        { ate: 4354.27, aliq: 0.12  },
        { ate: 8475.55, aliq: 0.14  },
    ]
    // Contribuição máxima: R$ 988,09
    const salarioContrib = Math.min(salario, 8475.55)
    let inss = 0
    let anterior = 0
    for (const faixa of faixas) {
        if (salarioContrib <= anterior) break
        const base = Math.min(salarioContrib, faixa.ate) - anterior
        inss += base * faixa.aliq
        anterior = faixa.ate
        if (salarioContrib <= faixa.ate) break
    }
    return Math.round(inss * 100) / 100
}

function calcIRRF(baseCalculo: number): number {
    // Tabela progressiva mensal IRRF 2026 (Lei nº 15.270/2025)
    // Passo 1: Calcular IRRF pela tabela progressiva base (mesma de 2025)
    let irrf = 0
    if (baseCalculo <= 2259.20) {
        irrf = 0
    } else if (baseCalculo <= 2826.65) {
        irrf = baseCalculo * 0.075 - 169.44
    } else if (baseCalculo <= 3751.05) {
        irrf = baseCalculo * 0.15  - 381.44
    } else if (baseCalculo <= 4664.68) {
        irrf = baseCalculo * 0.225 - 662.77
    } else {
        irrf = baseCalculo * 0.275 - 896.00
    }
    irrf = Math.max(0, irrf)

    // Passo 2: Aplicar novo redutor 2026 (Lei nº 15.270/2025)
    // Rendimento tributável até R$ 5.000,00 → IRRF = R$ 0,00 (isenção total)
    // R$ 5.000,01 a R$ 7.350,00 → redução decrescente proporcional
    // Acima de R$ 7.350,00 → sem redutor (tabela progressiva integral)
    const LIMITE_ISENCAO = 5000.00
    const LIMITE_REDUCAO = 7350.00
    // IRRF calculado em cima do limite de isenção (base do redutor = 479,00)
    const irrfNoLimite = LIMITE_ISENCAO * 0.275 - 896.00 // ≈ R$ 479,00

    if (baseCalculo <= LIMITE_ISENCAO) {
        irrf = 0
    } else if (baseCalculo <= LIMITE_REDUCAO) {
        const redutor = irrfNoLimite * (LIMITE_REDUCAO - baseCalculo) / (LIMITE_REDUCAO - LIMITE_ISENCAO)
        irrf = Math.max(0, irrf - redutor)
    }
    // baseCalculo > LIMITE_REDUCAO: irrf = tabela progressiva, sem redutor

    return Math.round(irrf * 100) / 100
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const HORAS_MENSAIS = 220
// VT: desconto máximo do empregado é 6% do salário bruto (Lei 7.418/85)
// Custo mensal estimado de transporte (2 trajetos × ~23 dias úteis)
const VT_CUSTO_ESTIMADO = 280.00 // custo médio mensal de transporte
const VT_DESCONTO_MAXIMO_PERC = 0.06 // 6% do salário bruto

function calcValeTransporte(salarioBruto: number): number {
    const descontoMaximo = Math.round(salarioBruto * VT_DESCONTO_MAXIMO_PERC * 100) / 100
    // O desconto do empregado é o MENOR entre 6% do salário e o custo real do VT
    return Math.min(descontoMaximo, VT_CUSTO_ESTIMADO)
}

const MESES_PT = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const fmt = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

interface SearchParams {
    mes?: string
    ano?: string
}

export default async function FolhaPagamentoPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>
}) {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const params = await searchParams
    const now = new Date()
    const mes = params.mes ? parseInt(params.mes, 10) : now.getMonth() + 1
    const ano = params.ano ? parseInt(params.ano, 10) : now.getFullYear()

    // Clamp values
    const mesIdx = Math.max(1, Math.min(12, isNaN(mes) ? now.getMonth() + 1 : mes))
    const anoVal = isNaN(ano) ? now.getFullYear() : ano
    const competencia = `${MESES_PT[mesIdx - 1]} / ${anoVal}`

    const employees = await prisma.employee.findMany({
        where: {
            companyId,
            status: 'ACTIVE',
        },
        orderBy: { name: 'asc' },
    })

    // Build rows with full payroll calculations
    const rows = employees.map(emp => {
        const costPerHour = Number(emp.costPerHour || 0)
        const salarioBruto = costPerHour * HORAS_MENSAIS
        const inss = calcINSS(salarioBruto)
        const baseIrrf = salarioBruto - inss
        const irrf = Math.max(0, calcIRRF(baseIrrf))
        const fgts = Math.round(salarioBruto * 0.08 * 100) / 100
        const vt = calcValeTransporte(salarioBruto)
        const salarioLiquido = Math.max(0, salarioBruto - inss - irrf - vt)
        const horasTrabalhadas = HORAS_MENSAIS

        return {
            id: emp.id,
            name: emp.name,
            jobTitle: emp.jobTitle,
            costPerHour,
            salarioBruto,
            horasTrabalhadas,
            inss,
            irrf,
            fgts,
            vt,
            salarioLiquido,
            hasRate: costPerHour > 0,
        }
    })

    // Aggregate totals
    const totalFuncionarios = rows.length
    const totalBruto = rows.reduce((s, r) => s + r.salarioBruto, 0)
    const totalLiquido = rows.reduce((s, r) => s + r.salarioLiquido, 0)
    const totalInss = rows.reduce((s, r) => s + r.inss, 0)
    const totalIrrf = rows.reduce((s, r) => s + r.irrf, 0)
    const totalFgts = rows.reduce((s, r) => s + r.fgts, 0)
    const totalVt = rows.reduce((s, r) => s + r.vt, 0)
    const totalEncargos = totalInss + totalFgts // employer-side charges

    // Month/year selector helper arrays
    const anos = [anoVal - 1, anoVal, anoVal + 1]

    return (
        <div className="space-y-6 print:space-y-4">
            {/* Header */}
            <div className="flex items-center gap-4 print:hidden">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/rh/funcionarios">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight">Folha de Pagamento</h1>
                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4" />
                        Competência:{" "}
                        <span className="font-medium">{competencia}</span>
                        <Badge variant="outline" className="ml-1">Estimativa</Badge>
                    </p>
                </div>
                <PayrollExportButton />
            </div>

            {/* Print-only header */}
            <div className="hidden print:block mb-4">
                <h1 className="text-2xl font-bold">Folha de Pagamento — {competencia}</h1>
                <p className="text-sm text-gray-600 mt-1">
                    Documento gerado em {new Date().toLocaleDateString('pt-BR')} · Estimativa de valores
                </p>
            </div>

            {/* Month / Year selector */}
            <form method="get" className="flex items-center gap-3 print:hidden">
                <label className="text-sm font-medium text-muted-foreground">Competência:</label>
                <select
                    name="mes"
                    defaultValue={mesIdx}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                >
                    {MESES_PT.map((m, i) => (
                        <option key={m} value={i + 1}>{m}</option>
                    ))}
                </select>
                <select
                    name="ano"
                    defaultValue={anoVal}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus:outline-hidden focus:ring-1 focus:ring-ring"
                >
                    {anos.map(a => (
                        <option key={a} value={a}>{a}</option>
                    ))}
                </select>
                <Button type="submit" size="sm" variant="secondary">Calcular</Button>
            </form>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-4 print:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Funcionários</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalFuncionarios}</div>
                        <p className="text-xs text-muted-foreground">Ativos em {competencia}</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Bruto</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{fmt(totalBruto)}</div>
                        <p className="text-xs text-muted-foreground">Baseado em {HORAS_MENSAIS}h/mês</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Encargos</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{fmt(totalEncargos)}</div>
                        <p className="text-xs text-muted-foreground">INSS + FGTS (empregador)</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Líquido</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">{fmt(totalLiquido)}</div>
                        <p className="text-xs text-muted-foreground">A pagar aos colaboradores</p>
                    </CardContent>
                </Card>
            </div>

            {/* Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 print:hidden">
                <strong>Nota:</strong> Valores estimados com base no custo/hora × {HORAS_MENSAIS}h mensais.
                INSS pela tabela progressiva 2026 (Portaria MPS/MF nº 13/2026 — teto R$ 8.475,55).
                IRRF pela Lei nº 15.270/2025: isenção total até R$ 5.000; redução decrescente até R$ 7.350.
                FGTS 8% é encargo do empregador (não deduzido do salário).
                Vale Transporte: desconto de até 6% do salário bruto ou custo estimado de {fmt(VT_CUSTO_ESTIMADO)}/mês, o que for menor (Lei 7.418/85).
                Consulte seu contador para valores definitivos.
            </div>

            {/* Payroll Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Detalhamento por Colaborador</CardTitle>
                    <CardDescription>
                        {totalFuncionarios} funcionários ativos — {competencia}
                    </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    {rows.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p>Nenhum funcionário ativo cadastrado.</p>
                            <Button variant="outline" className="mt-4 print:hidden" asChild>
                                <Link href="/rh/funcionarios">Ir para Funcionários</Link>
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Cargo</TableHead>
                                    <TableHead className="text-right">Salário Base</TableHead>
                                    <TableHead className="text-right">Horas Trab.</TableHead>
                                    <TableHead className="text-right">INSS</TableHead>
                                    <TableHead className="text-right">IRRF</TableHead>
                                    <TableHead className="text-right">FGTS (emp.)</TableHead>
                                    <TableHead className="text-right">Vale Transp.</TableHead>
                                    <TableHead className="text-right font-semibold">Salário Líquido</TableHead>
                                    <TableHead className="text-center">Situação</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map(emp => (
                                    <TableRow key={emp.id}>
                                        <TableCell className="font-medium">{emp.name}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{emp.jobTitle}</TableCell>

                                        {/* Salário Base */}
                                        <TableCell className="text-right font-mono text-sm">
                                            {emp.hasRate
                                                ? fmt(emp.salarioBruto)
                                                : <span className="text-muted-foreground">—</span>}
                                        </TableCell>

                                        {/* Horas Trabalhadas */}
                                        <TableCell className="text-right text-sm">
                                            {emp.horasTrabalhadas}h
                                        </TableCell>

                                        {/* INSS */}
                                        <TableCell className="text-right text-red-600 text-sm">
                                            {emp.hasRate ? fmt(emp.inss) : '—'}
                                        </TableCell>

                                        {/* IRRF */}
                                        <TableCell className="text-right text-red-600 text-sm">
                                            {emp.hasRate ? fmt(emp.irrf) : '—'}
                                        </TableCell>

                                        {/* FGTS */}
                                        <TableCell className="text-right text-orange-600 text-sm">
                                            {emp.hasRate ? fmt(emp.fgts) : '—'}
                                        </TableCell>

                                        {/* Vale Transporte */}
                                        <TableCell className="text-right text-blue-600 text-sm">
                                            {fmt(emp.vt)}
                                        </TableCell>

                                        {/* Salário Líquido */}
                                        <TableCell className="text-right font-semibold text-green-700">
                                            {emp.hasRate
                                                ? fmt(emp.salarioLiquido)
                                                : <span className="text-muted-foreground text-sm font-normal">Sem custo/hora</span>}
                                        </TableCell>

                                        {/* Situação */}
                                        <TableCell className="text-center">
                                            {emp.hasRate ? (
                                                <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                                                    Calculado
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                                                    Pendente
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>

                            {/* Footer totals row */}
                            <tfoot>
                                <tr className="border-t-2 border-border bg-muted/50 font-semibold text-sm">
                                    <td colSpan={2} className="px-4 py-3 text-right text-xs uppercase text-muted-foreground tracking-wide">
                                        Totais ({totalFuncionarios} colaboradores)
                                    </td>
                                    <td className="px-4 py-3 text-right">{fmt(totalBruto)}</td>
                                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                                        {HORAS_MENSAIS}h
                                    </td>
                                    <td className="px-4 py-3 text-right text-red-600">{fmt(totalInss)}</td>
                                    <td className="px-4 py-3 text-right text-red-600">{fmt(totalIrrf)}</td>
                                    <td className="px-4 py-3 text-right text-orange-600">{fmt(totalFgts)}</td>
                                    <td className="px-4 py-3 text-right text-blue-600">{fmt(totalVt)}</td>
                                    <td className="px-4 py-3 text-right text-green-700">{fmt(totalLiquido)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
