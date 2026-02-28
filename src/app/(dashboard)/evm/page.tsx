import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ArrowLeft, BarChart3, Building2, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EvmChart } from "@/components/evm/evm-chart"

export const dynamic = 'force-dynamic'

const fmt = (n: number) =>
    new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
    }).format(n)

const fmtPct = (n: number) => n.toFixed(2)

export default async function EvmPage() {
    const session = await getSession()
    if (!session) redirect("/login")
    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const projects = await prisma.project.findMany({
        where: { companyId, status: { in: ["IN_PROGRESS", "COMPLETED", "PLANNING"] } },
        select: {
            id: true,
            name: true,
            status: true,
            budget: true,
            startDate: true,
            endDate: true,
            tasks: {
                select: {
                    id: true,
                    name: true,
                    startDate: true,
                    endDate: true,
                    percentDone: true,
                    status: true,
                },
            },
            bulletins: {
                where: { status: { in: ["APPROVED", "BILLED"] } },
                select: { totalValue: true },
            },
        },
        orderBy: { name: "asc" },
    })

    const now = new Date()

    // Calculate EVM metrics for each project
    const evmData = projects.map(p => {
        const budget = Number(p.budget || 0) // BAC - Budget at Completion
        const startDate = new Date(p.startDate)
        const endDate = p.endDate ? new Date(p.endDate) : now

        // Planned Value (PV): what should have been done by now (time-based)
        const totalDuration = Math.max(1, endDate.getTime() - startDate.getTime())
        const elapsed = Math.min(now.getTime() - startDate.getTime(), totalDuration)
        const timeProgress = Math.max(0, Math.min(elapsed / totalDuration, 1))
        const pv = budget * timeProgress

        // Earned Value (EV): work actually completed (based on task percentDone)
        const totalTasks = p.tasks.length
        const avgPercentDone = totalTasks > 0
            ? p.tasks.reduce((s, t) => s + (t.percentDone ?? 0), 0) / totalTasks
            : 0
        const ev = budget * (avgPercentDone / 100)

        // Actual Cost (AC): money actually spent (approved bulletins)
        const ac = p.bulletins.reduce((s, b) => s + Number(b.totalValue || 0), 0)

        // EVM Indices
        const sv = ev - pv // Schedule Variance (EV - PV)
        const cv = ev - ac // Cost Variance (EV - AC)
        const spi = pv > 0 ? ev / pv : 0 // Schedule Performance Index
        const cpi = ac > 0 ? ev / ac : (ev > 0 ? 999 : 0) // Cost Performance Index

        // Estimate at Completion (EAC)
        const eac = cpi > 0 ? budget / cpi : budget
        // Estimate to Complete (ETC)
        const etc = eac - ac
        // Variance at Completion (VAC)
        const vac = budget - eac

        return {
            id: p.id,
            name: p.name,
            status: p.status,
            budget,
            pv,
            ev,
            ac,
            sv,
            cv,
            spi,
            cpi,
            eac,
            etc,
            vac,
            avgPercentDone,
            timeProgress: timeProgress * 100,
        }
    })

    const projectsWithData = evmData.filter(p => p.budget > 0)

    const statusLabel: Record<string, string> = {
        IN_PROGRESS: "Em Andamento",
        PLANNING: "Planejamento",
        COMPLETED: "Concluido",
        ON_HOLD: "Pausado",
        CANCELLED: "Cancelado",
    }

    const statusColor: Record<string, string> = {
        IN_PROGRESS: "bg-green-100 text-green-800",
        PLANNING: "bg-purple-100 text-purple-800",
        COMPLETED: "bg-blue-100 text-blue-800",
        ON_HOLD: "bg-yellow-100 text-yellow-800",
    }

    // Aggregate totals
    const totalBAC = projectsWithData.reduce((s, p) => s + p.budget, 0)
    const totalEV = projectsWithData.reduce((s, p) => s + p.ev, 0)
    const totalAC = projectsWithData.reduce((s, p) => s + p.ac, 0)
    const totalPV = projectsWithData.reduce((s, p) => s + p.pv, 0)
    const overallCPI = totalAC > 0 ? totalEV / totalAC : 0
    const overallSPI = totalPV > 0 ? totalEV / totalPV : 0

    // Chart data for EVM
    const chartData = projectsWithData.map(p => ({
        name: p.name.length > 18 ? p.name.slice(0, 16) + "..." : p.name,
        BAC: Math.round(p.budget),
        PV: Math.round(p.pv),
        EV: Math.round(p.ev),
        AC: Math.round(p.ac),
    }))

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/relatorios">
                        <ArrowLeft className="h-4 w-4 mr-2" />Relatorios
                    </Link>
                </Button>
            </div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <BarChart3 className="h-7 w-7 text-indigo-600" />
                    Earned Value Management (EVM)
                </h1>
                <p className="text-muted-foreground">
                    Analise de valor agregado — desempenho de prazo e custo dos projetos
                </p>
            </div>

            {projectsWithData.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground font-medium">
                            Nenhum projeto com orcamento encontrado.
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Cadastre o orcamento nos projetos para calcular os indicadores EVM.
                        </p>
                        <Button variant="outline" className="mt-4" asChild>
                            <Link href="/projects">Ir para Projetos</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Portfolio KPIs */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                                    BAC Total (Orcamento)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{fmt(totalBAC)}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                                    EV Total (Valor Agregado)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-700">{fmt(totalEV)}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                                    IDP (SPI) Portfolio
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${overallSPI >= 1 ? "text-green-700" : "text-red-600"}`}>
                                    {fmtPct(overallSPI)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {overallSPI >= 1 ? "Adiantado" : "Atrasado"} em prazo
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground uppercase">
                                    IDC (CPI) Portfolio
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${overallCPI >= 1 ? "text-green-700" : "text-red-600"}`}>
                                    {fmtPct(overallCPI)}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {overallCPI >= 1 ? "Abaixo do orcamento" : "Acima do orcamento"}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">
                                Comparativo BAC / PV / EV / AC por Projeto
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <EvmChart data={chartData} />
                        </CardContent>
                    </Card>

                    {/* Detailed table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Indicadores EVM por Projeto</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-muted-foreground">
                                            <th className="text-left py-2 pr-3">Projeto</th>
                                            <th className="text-right py-2 pr-3">BAC</th>
                                            <th className="text-right py-2 pr-3">PV</th>
                                            <th className="text-right py-2 pr-3">EV</th>
                                            <th className="text-right py-2 pr-3">AC</th>
                                            <th className="text-right py-2 pr-3">SV</th>
                                            <th className="text-right py-2 pr-3">CV</th>
                                            <th className="text-right py-2 pr-3">SPI</th>
                                            <th className="text-right py-2 pr-3">CPI</th>
                                            <th className="text-right py-2 pr-3">EAC</th>
                                            <th className="text-left py-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {evmData.map(proj => (
                                            <tr key={proj.id} className="border-b last:border-0 hover:bg-muted/30">
                                                <td className="py-2 pr-3 font-medium max-w-[150px] truncate">{proj.name}</td>
                                                <td className="py-2 pr-3 text-right font-mono text-xs">{fmt(proj.budget)}</td>
                                                <td className="py-2 pr-3 text-right font-mono text-xs">{fmt(proj.pv)}</td>
                                                <td className="py-2 pr-3 text-right font-mono text-xs text-blue-700">{fmt(proj.ev)}</td>
                                                <td className="py-2 pr-3 text-right font-mono text-xs">{fmt(proj.ac)}</td>
                                                <td className={`py-2 pr-3 text-right font-mono text-xs ${proj.sv >= 0 ? "text-green-700" : "text-red-600"}`}>
                                                    {proj.sv >= 0 ? "+" : ""}{fmt(proj.sv)}
                                                </td>
                                                <td className={`py-2 pr-3 text-right font-mono text-xs ${proj.cv >= 0 ? "text-green-700" : "text-red-600"}`}>
                                                    {proj.cv >= 0 ? "+" : ""}{fmt(proj.cv)}
                                                </td>
                                                <td className="py-2 pr-3 text-right">
                                                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${proj.spi >= 1 ? "text-green-700" : "text-red-600"}`}>
                                                        {proj.spi >= 1 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                        {fmtPct(proj.spi)}
                                                    </span>
                                                </td>
                                                <td className="py-2 pr-3 text-right">
                                                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${proj.cpi >= 1 ? "text-green-700" : "text-red-600"}`}>
                                                        {proj.cpi >= 1 ? <TrendingUp className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                                                        {proj.cpi > 100 ? "N/A" : fmtPct(proj.cpi)}
                                                    </span>
                                                </td>
                                                <td className="py-2 pr-3 text-right font-mono text-xs">{fmt(proj.eac)}</td>
                                                <td className="py-2">
                                                    <Badge className={statusColor[proj.status] ?? "bg-gray-100 text-gray-800"}>
                                                        {statusLabel[proj.status] ?? proj.status}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Legend */}
                    <Card className="bg-muted/30">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Legenda EVM</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 text-xs text-muted-foreground">
                                <div><strong>BAC</strong> - Budget at Completion (Orcamento Total)</div>
                                <div><strong>PV</strong> - Planned Value (Valor Planejado)</div>
                                <div><strong>EV</strong> - Earned Value (Valor Agregado)</div>
                                <div><strong>AC</strong> - Actual Cost (Custo Real)</div>
                                <div><strong>SV</strong> - Schedule Variance (Variacao de Prazo = EV - PV)</div>
                                <div><strong>CV</strong> - Cost Variance (Variacao de Custo = EV - AC)</div>
                                <div><strong>SPI</strong> - Schedule Performance Index (EV / PV, ideal &ge; 1)</div>
                                <div><strong>CPI</strong> - Cost Performance Index (EV / AC, ideal &ge; 1)</div>
                                <div><strong>EAC</strong> - Estimate at Completion (Estimativa final = BAC / CPI)</div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
