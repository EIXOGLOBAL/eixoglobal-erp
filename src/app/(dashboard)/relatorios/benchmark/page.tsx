import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown, Building2, Ruler } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BenchmarkChart } from '@/components/relatorios/benchmark-chart'

const fmt = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 }).format(n)
const fmtM2 = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + "/m²"
const fmtNum = (n: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(n)

export default async function BenchmarkPage() {
    const session = await getSession()
    if (!session) redirect("/login")
    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const projects = await prisma.project.findMany({
        where: { companyId, status: { in: ["IN_PROGRESS", "COMPLETED"] } },
        include: {
            bulletins: { where: { status: { in: ["APPROVED", "BILLED"] } }, select: { totalValue: true } },
            company: { select: { name: true } },
        },
    })

    const benchmark = projects
        .filter(p => p.area && p.area > 0)
        .map(p => {
            const totalSpent = p.bulletins.reduce((s, m) => s + Number(m.totalValue || 0), 0)
            const budget = Number(p.budget || 0)
            const costPerM2Spent = totalSpent / p.area!
            const costPerM2Budget = budget / p.area!
            return { ...p, totalSpent, costPerM2Spent, costPerM2Budget }
        })
        .sort((a, b) => a.costPerM2Spent - b.costPerM2Spent)

    const avgSpent = benchmark.length > 0 ? benchmark.reduce((s, p) => s + p.costPerM2Spent, 0) / benchmark.length : 0
    const avgBudget = benchmark.length > 0 ? benchmark.reduce((s, p) => s + p.costPerM2Budget, 0) / benchmark.length : 0
    const cheapest = benchmark[0]
    const mostExpensive = benchmark[benchmark.length - 1]

    const chartData = benchmark.map(p => ({
        name: p.name.length > 20 ? p.name.substring(0, 20) + "..." : p.name,
        orcado: Math.round(p.costPerM2Budget * 100) / 100,
        realizado: Math.round(p.costPerM2Spent * 100) / 100,
    }))

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/relatorios"><ArrowLeft className="h-4 w-4 mr-2" />Relatórios</Link>
                </Button>
            </div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Benchmark de Obras</h1>
                <p className="text-muted-foreground">Comparativo de custo por m² entre projetos</p>
            </div>
            {benchmark.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Nenhum projeto com área cadastrada encontrado.</p>
                        <p className="text-sm text-muted-foreground mt-1">Cadastre a área (m²) nos projetos para visualizar o benchmark.</p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Custo/m² Médio Realizado</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{fmtM2(avgSpent)}</div></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Custo/m² Médio Orçado</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{fmtM2(avgBudget)}</div></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Projeto Mais Econômico</CardTitle></CardHeader><CardContent><div className="text-lg font-bold text-green-700 truncate">{cheapest?.name ?? "—"}</div><p className="text-sm text-muted-foreground">{cheapest ? fmtM2(cheapest.costPerM2Spent) : ""}</p></CardContent></Card>
                        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground uppercase">Projeto Mais Caro</CardTitle></CardHeader><CardContent><div className="text-lg font-bold text-red-700 truncate">{mostExpensive?.name ?? "—"}</div><p className="text-sm text-muted-foreground">{mostExpensive ? fmtM2(mostExpensive.costPerM2Spent) : ""}</p></CardContent></Card>
                    </div>
                    <Card>
                        <CardHeader><CardTitle className="text-base">Benchmark por Projeto (Orçado vs Realizado em R$/m²)</CardTitle></CardHeader>
                        <CardContent>
                            <BenchmarkChart data={chartData} />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Ruler className="h-4 w-4" />Tabela Comparativa</CardTitle></CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead><tr className="border-b text-muted-foreground">
                                        <th className="text-left py-2 pr-4">Projeto</th>
                                        <th className="text-right py-2 pr-4">Área (m²)</th>
                                        <th className="text-right py-2 pr-4">Orçamento/m²</th>
                                        <th className="text-right py-2 pr-4">Realizado/m²</th>
                                        <th className="text-right py-2">Diferença %</th>
                                    </tr></thead>
                                    <tbody>
                                        {benchmark.map(proj => {
                                            const diff = proj.costPerM2Budget > 0 ? ((proj.costPerM2Spent - proj.costPerM2Budget) / proj.costPerM2Budget) * 100 : 0
                                            const isOver = diff > 0
                                            return (
                                                <tr key={proj.id} className="border-b last:border-0">
                                                    <td className="py-2 pr-4 font-medium">{proj.name}</td>
                                                    <td className="py-2 pr-4 text-right">{fmtNum(proj.area!)}</td>
                                                    <td className="py-2 pr-4 text-right">{fmtM2(proj.costPerM2Budget)}</td>
                                                    <td className="py-2 pr-4 text-right">{fmtM2(proj.costPerM2Spent)}</td>
                                                    <td className="py-2 text-right">
                                                        <Badge variant="outline" className={isOver ? "bg-red-100 text-red-800 border-red-200" : "bg-green-100 text-green-800 border-green-200"}>
                                                            {isOver ? "+" : ""}{fmtNum(diff)}%
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
