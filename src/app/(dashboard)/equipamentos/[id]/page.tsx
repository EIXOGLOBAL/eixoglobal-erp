import { getEquipmentById } from '@/app/actions/equipment-actions'
import { getProjects } from '@/app/actions/project-actions'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Truck, Wrench, Calendar, DollarSign, Tag, Info, TrendingDown, TrendingUp } from 'lucide-react'
import { EquipmentDialog } from '@/components/equipamentos/equipment-dialog'
import { UsageDialog } from '@/components/equipamentos/usage-dialog'
import { MaintenanceDialog } from '@/components/equipamentos/maintenance-dialog'
import { EquipmentDetailClient } from '@/components/equipamentos/equipment-detail-client'
import { toNumber, formatCurrency } from '@/lib/formatters'

export const dynamic = 'force-dynamic'

const EQUIPMENT_TYPE_LABELS: Record<string, string> = {
    VEHICLE: "Veículo", CRANE: "Guindaste/Grua", EXCAVATOR: "Escavadeira",
    CONCRETE_MIXER: "Betoneira", COMPRESSOR: "Compressor", GENERATOR: "Gerador",
    SCAFFOLD: "Andaime", FORMWORK: "Forma/Escoramento", PUMP: "Bomba",
    TOOL: "Ferramenta", OTHER: "Outro",
}
const EQUIPMENT_STATUS_LABELS: Record<string, string> = {
    AVAILABLE: "Disponível", IN_USE: "Em Uso", MAINTENANCE: "Em Manutenção",
    INACTIVE: "Inativo", RENTED_OUT: "Locado",
}
const STATUS_COLORS: Record<string, string> = {
    AVAILABLE: "bg-green-100 text-green-800 border-green-200",
    IN_USE: "bg-blue-100 text-blue-800 border-blue-200",
    MAINTENANCE: "bg-orange-100 text-orange-800 border-orange-200",
    INACTIVE: "bg-gray-100 text-gray-800 border-gray-200",
    RENTED_OUT: "bg-purple-100 text-purple-800 border-purple-200",
}
const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
    PREVENTIVE: "Preventiva", CORRECTIVE: "Corretiva", INSPECTION: "Inspeção",
}
const fmt = { format: formatCurrency } // Compatibilidade com código existente
const fmtDate = (d: Date | string | null | undefined) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : '—'
interface PageProps { params: Promise<{ id: string }> }
export default async function EquipamentoDetailPage({ params }: PageProps) {
    const session = await getSession()
    if (!session) redirect("/login")
    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")
    const { id } = await params
    const [equipResult, projectsResult] = await Promise.all([
        getEquipmentById(id), getProjects(companyId),
    ])
    if (!equipResult.success || !equipResult.data) notFound()
    const equipment = equipResult.data
    const projects = projectsResult.success ? (projectsResult.data ?? []) : []
    const totalUsageCost = equipment.usages.reduce((sum, u) => sum + toNumber(u.totalCost), 0)
    const totalMaintenanceCost = equipment.maintenances
        .filter(m => m.completedAt)
        .reduce((sum, m) => sum + toNumber(m.cost), 0)
    const totalCost = totalUsageCost + totalMaintenanceCost
    const totalHours = equipment.usages.reduce((sum, u) => sum + toNumber(u.hours), 0)
    const totalDays = equipment.usages.reduce((sum, u) => sum + toNumber(u.days), 0)
    const costPerHourActual = totalHours > 0 ? totalUsageCost / totalHours : 0
    const costByProject = equipment.usages.reduce((acc, u) => {
        const key = u.projectId ?? 'Sem Projeto'
        const name = u.project?.name ?? 'Sem Projeto'
        if (!acc[key]) acc[key] = { name, hours: 0, days: 0, cost: 0 }
        acc[key].hours += toNumber(u.hours)
        acc[key].days += toNumber(u.days)
        acc[key].cost += toNumber(u.totalCost)
        return acc
    }, {} as Record<string, { name: string; hours: number; days: number; cost: number }>)
    const costByProjectList = Object.values(costByProject).sort((a, b) => b.cost - a.cost)
    const registeredCostPerHour = equipment.costPerHour != null ? toNumber(equipment.costPerHour) : null
    const costVarianceAbove = registeredCostPerHour != null && costPerHourActual > registeredCostPerHour
    const costVarianceBelow = registeredCostPerHour != null && costPerHourActual < registeredCostPerHour
    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold tracking-tight">{equipment.name}</h2>
                        <Badge variant="outline" className={STATUS_COLORS[equipment.status] ?? ""}>
                            {EQUIPMENT_STATUS_LABELS[equipment.status] ?? equipment.status}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground">
                        {equipment.code} · {EQUIPMENT_TYPE_LABELS[equipment.type] ?? equipment.type}
                        {equipment.brand && ` · ${equipment.brand}`}
                        {equipment.model && ` ${equipment.model}`}
                        {equipment.year && ` (${equipment.year})`}
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <UsageDialog equipmentId={equipment.id} projects={projects.map(p => ({ id: p.id, name: p.name }))} />
                    <MaintenanceDialog equipmentId={equipment.id} />
                    <EquipmentDialog companyId={companyId} equipment={{
                        id: equipment.id, code: equipment.code, name: equipment.name,
                        type: equipment.type, brand: equipment.brand, model: equipment.model,
                        year: equipment.year,
                        costPerHour: equipment.costPerHour !== null ? toNumber(equipment.costPerHour) : null,
                        costPerDay: equipment.costPerDay !== null ? toNumber(equipment.costPerDay) : null,
                        isOwned: equipment.isOwned, notes: equipment.notes,
                    }} />
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Tipo</CardTitle><Tag className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-lg font-semibold">{EQUIPMENT_TYPE_LABELS[equipment.type] ?? equipment.type}</div><p className="text-xs text-muted-foreground">{equipment.isOwned ? "Equipamento Próprio" : "Equipamento Locado"}</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Marca / Modelo</CardTitle><Truck className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-lg font-semibold">{equipment.brand ?? "—"}</div><p className="text-xs text-muted-foreground">{equipment.model ?? "Modelo não informado"}{equipment.year ? ` · ${equipment.year}` : ""}</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Custo/Hora</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-lg font-semibold">{equipment.costPerHour != null ? fmt.format(Number(equipment.costPerHour)) : "—"}</div><p className="text-xs text-muted-foreground">Dia: {equipment.costPerDay != null ? fmt.format(Number(equipment.costPerDay)) : "—"}</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Custo Total</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-lg font-semibold">{fmt.format(totalCost)}</div><p className="text-xs text-muted-foreground">Uso + Manutenção</p></CardContent></Card>
            </div>
            <Tabs defaultValue="usage">
                <TabsList>
                    <TabsTrigger value="usage"><Calendar className="h-4 w-4 mr-2" />Histórico de Uso ({equipment._count.usages})</TabsTrigger>
                    <TabsTrigger value="maintenance"><Wrench className="h-4 w-4 mr-2" />Manutenções ({equipment._count.maintenances})</TabsTrigger>
                    <TabsTrigger value="custos"><DollarSign className="h-4 w-4 mr-2" />Custos</TabsTrigger>
                    <TabsTrigger value="general"><Info className="h-4 w-4 mr-2" />Dados Gerais</TabsTrigger>
                </TabsList>
                <TabsContent value="usage">
                    <Card><CardHeader><CardTitle>Histórico de Uso</CardTitle></CardHeader><CardContent>
                        {equipment.usages.length === 0 ? (
                            <p className="text-muted-foreground text-sm py-4 text-center">Nenhum uso registrado. Use o botão &quot;Registrar Uso&quot; acima.</p>
                        ) : (
                            <EquipmentDetailClient
                                usages={equipment.usages.map(u => ({
                                    id: u.id, projectName: u.project.name, startDate: u.startDate,
                                    endDate: u.endDate ?? null,
                                    hours: u.hours !== null ? toNumber(u.hours) : null,
                                    days: u.days !== null ? toNumber(u.days) : null,
                                    totalCost: u.totalCost !== null ? toNumber(u.totalCost) : null,
                                    operator: u.operator ?? null,
                                }))}
                                maintenances={equipment.maintenances.map(m => ({
                                    id: m.id, type: m.type, description: m.description,
                                    scheduledAt: m.scheduledAt, completedAt: m.completedAt ?? null,
                                    cost: m.cost !== null ? toNumber(m.cost) : null,
                                    provider: m.provider ?? null,
                                }))}
                                equipmentId={equipment.id} activeTab="usage" />
                        )}
                    </CardContent></Card>
                </TabsContent>
                <TabsContent value="maintenance">
                    <Card><CardHeader><CardTitle>Manutenções</CardTitle></CardHeader><CardContent>
                        {equipment.maintenances.length === 0 ? (
                            <p className="text-muted-foreground text-sm py-4 text-center">Nenhuma manutenção registrada. Use o botão &quot;Agendar Manutenção&quot; acima.</p>
                        ) : (
                            <div className="overflow-x-auto"><table className="w-full text-sm">
                                <thead><tr className="border-b text-muted-foreground">
                                    <th className="text-left py-2 pr-4">Tipo</th>
                                    <th className="text-left py-2 pr-4">Descrição</th>
                                    <th className="text-left py-2 pr-4">Agendada</th>
                                    <th className="text-left py-2 pr-4">Concluída</th>
                                    <th className="text-left py-2 pr-4">Prestador</th>
                                    <th className="text-right py-2 pr-4">Custo</th>
                                    <th className="text-center py-2">Status</th>
                                    <th className="text-center py-2">Ação</th>
                                </tr></thead>
                                <tbody>{equipment.maintenances.map(m => (
                                    <tr key={m.id} className="border-b last:border-0">
                                        <td className="py-2 pr-4"><Badge variant="outline">{MAINTENANCE_TYPE_LABELS[m.type] ?? m.type}</Badge></td>
                                        <td className="py-2 pr-4 max-w-[200px] truncate">{m.description}</td>
                                        <td className="py-2 pr-4 text-muted-foreground">{fmtDate(m.scheduledAt)}</td>
                                        <td className="py-2 pr-4 text-muted-foreground">{fmtDate(m.completedAt)}</td>
                                        <td className="py-2 pr-4 text-muted-foreground">{m.provider ?? "—"}</td>
                                        <td className="py-2 pr-4 text-right">{m.cost != null ? fmt.format(Number(m.cost)) : "—"}</td>
                                        <td className="py-2 text-center">{m.completedAt ? (<Badge className="bg-green-100 text-green-800 border-green-200" variant="outline">Concluída</Badge>) : (<Badge className="bg-orange-100 text-orange-800 border-orange-200" variant="outline">Pendente</Badge>)}</td>
                                        <td className="py-2 text-center">{!m.completedAt && <CompleteMaintenanceButton maintenanceId={m.id} equipmentId={equipment.id} />}</td>
                                    </tr>
                                ))}</tbody>
                            </table></div>
                        )}
                    </CardContent></Card>
                </TabsContent>
                <TabsContent value="custos">
                    <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-3">
                            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total de Uso (R$)</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{fmt.format(totalUsageCost)}</div><p className="text-xs text-muted-foreground">{totalHours}h · {totalDays} dias</p></CardContent></Card>
                            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total de Manutenções (R$)</CardTitle><Wrench className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{fmt.format(totalMaintenanceCost)}</div><p className="text-xs text-muted-foreground">Apenas concluídas</p></CardContent></Card>
                            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Custo Total (R$)</CardTitle><DollarSign className="h-4 w-4 text-blue-600" /></CardHeader><CardContent><div className="text-2xl font-bold text-blue-700">{fmt.format(totalCost)}</div><p className="text-xs text-muted-foreground">Uso + Manutenções</p></CardContent></Card>
                        </div>
                        <Card>
                            <CardHeader><CardTitle className="text-base">Comparativo Custo/Hora</CardTitle></CardHeader>
                            <CardContent>
                                <div className="grid gap-4 md:grid-cols-3 items-center">
                                    <div className="text-center"><p className="text-xs text-muted-foreground mb-1">Custo/hora cadastrado</p><p className="text-2xl font-bold">{registeredCostPerHour != null ? fmt.format(registeredCostPerHour) : "—"}</p><p className="text-xs text-muted-foreground">por hora</p></div>
                                    <div className="text-center"><p className="text-xs text-muted-foreground mb-1">Custo/hora real</p><p className="text-2xl font-bold">{totalHours > 0 ? fmt.format(costPerHourActual) : "—"}</p><p className="text-xs text-muted-foreground">{totalHours > 0 ? "baseado em " + totalHours + "h" : "sem horas registradas"}</p></div>
                                    <div className="text-center">{registeredCostPerHour != null && totalHours > 0 ? (
                                        costVarianceAbove ? (<div className="flex flex-col items-center gap-1"><TrendingUp className="h-8 w-8 text-red-600" /><p className="text-sm font-semibold text-red-600">Custo real acima do previsto</p><p className="text-xs text-muted-foreground">+{fmt.format(costPerHourActual - (registeredCostPerHour ?? 0))}/h</p></div>)
                                        : costVarianceBelow ? (<div className="flex flex-col items-center gap-1"><TrendingDown className="h-8 w-8 text-green-600" /><p className="text-sm font-semibold text-green-600">Custo real abaixo do previsto</p><p className="text-xs text-muted-foreground">{fmt.format(costPerHourActual - (registeredCostPerHour ?? 0))}/h</p></div>)
                                        : (<p className="text-sm font-semibold text-blue-600">Custo exatamente no previsto</p>)
                                    ) : (<p className="text-sm text-muted-foreground">Dados insuficientes para comparação</p>)}</div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-base">Custo por Projeto</CardTitle></CardHeader>
                            <CardContent>
                                {costByProjectList.length === 0 ? (<p className="text-sm text-muted-foreground text-center py-4">Nenhum uso registrado.</p>) : (
                                <div className="overflow-x-auto"><table className="w-full text-sm">
                                    <thead><tr className="border-b text-muted-foreground"><th className="text-left py-2 pr-4">Projeto</th><th className="text-right py-2 pr-4">Horas</th><th className="text-right py-2 pr-4">Dias</th><th className="text-right py-2">Custo</th></tr></thead>
                                    <tbody>{costByProjectList.map((proj, idx) => (<tr key={idx} className="border-b last:border-0"><td className="py-2 pr-4 font-medium">{proj.name}</td><td className="py-2 pr-4 text-right">{proj.hours > 0 ? proj.hours : "—"}</td><td className="py-2 pr-4 text-right">{proj.days > 0 ? proj.days : "—"}</td><td className="py-2 text-right font-semibold">{fmt.format(proj.cost)}</td></tr>))}</tbody>
                                    <tfoot><tr className="border-t font-semibold"><td className="py-2 pr-4">Total</td><td className="py-2 pr-4 text-right">{totalHours}</td><td className="py-2 pr-4 text-right">{totalDays}</td><td className="py-2 text-right text-blue-700">{fmt.format(totalUsageCost)}</td></tr></tfoot>
                                </table></div>)}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
                <TabsContent value="general">
                    <Card><CardHeader><CardTitle>Dados Gerais</CardTitle></CardHeader><CardContent>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div><p className="text-sm font-medium text-muted-foreground">Código</p><p className="font-mono">{equipment.code}</p></div>
                            <div><p className="text-sm font-medium text-muted-foreground">Nome</p><p>{equipment.name}</p></div>
                            <div><p className="text-sm font-medium text-muted-foreground">Tipo</p><p>{EQUIPMENT_TYPE_LABELS[equipment.type] ?? equipment.type}</p></div>
                            <div><p className="text-sm font-medium text-muted-foreground">Posse</p><p>{equipment.isOwned ? "Próprio" : "Locado"}</p></div>
                            <div><p className="text-sm font-medium text-muted-foreground">Marca</p><p>{equipment.brand ?? "—"}</p></div>
                            <div><p className="text-sm font-medium text-muted-foreground">Modelo</p><p>{equipment.model ?? "—"}</p></div>
                            <div><p className="text-sm font-medium text-muted-foreground">Ano</p><p>{equipment.year ?? "—"}</p></div>
                            <div><p className="text-sm font-medium text-muted-foreground">Status</p><Badge variant="outline" className={STATUS_COLORS[equipment.status] ?? ""}>{EQUIPMENT_STATUS_LABELS[equipment.status] ?? equipment.status}</Badge></div>
                            <div><p className="text-sm font-medium text-muted-foreground">Custo por Hora</p><p>{equipment.costPerHour != null ? fmt.format(Number(equipment.costPerHour)) : "—"}</p></div>
                            <div><p className="text-sm font-medium text-muted-foreground">Custo por Dia</p><p>{equipment.costPerDay != null ? fmt.format(Number(equipment.costPerDay)) : "—"}</p></div>
                            {equipment.notes && (<div className="col-span-2"><p className="text-sm font-medium text-muted-foreground">Observações</p><p className="text-sm">{equipment.notes}</p></div>)}
                        </div>
                    </CardContent></Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function CompleteMaintenanceButton({ maintenanceId, equipmentId }: { maintenanceId: string; equipmentId: string }) {
    return (
        <form action={async () => {
            'use server'
            const { completeMaintenance } = await import('@/app/actions/equipment-actions')
            await completeMaintenance(maintenanceId, new Date().toISOString(), undefined)
        }}>
            <button type="submit" className="text-xs text-blue-600 hover:text-blue-800 underline">Concluir</button>
        </form>
    )
}
