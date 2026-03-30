import { getEquipment } from "@/app/actions/equipment-actions"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Truck, Wrench, AlertCircle, DollarSign } from "lucide-react"
import { EquipmentDialog } from "@/components/equipamentos/equipment-dialog"
import { EquipmentTable } from "@/components/equipamentos/equipment-table"
import { toNumber, formatCurrency } from "@/lib/formatters"

export const dynamic = 'force-dynamic'

export default async function EquipamentosPage() {
    const session = await getSession()
    if (!session) redirect("/login")

    const companyId = session.user?.companyId
    if (!companyId) redirect("/login")

    const result = await getEquipment({ companyId })
    const equipment = result.data ?? []

    const available = equipment.filter(e => e.status === 'AVAILABLE').length
    const inUse = equipment.filter(e => e.status === 'IN_USE').length
    const inMaintenance = equipment.filter(e => e.status === 'MAINTENANCE').length

    const ownedWithCost = equipment.filter(e => e.isOwned && e.costPerHour != null)
    const avgCostPerHour = ownedWithCost.length > 0
        ? ownedWithCost.reduce((sum, e) => sum + toNumber(e.costPerHour), 0) / ownedWithCost.length
        : 0

    // Converter Decimal para number para Client Components
    const serializedEquipment = equipment.map(e => ({
        ...e,
        costPerHour: e.costPerHour !== null ? toNumber(e.costPerHour) : null,
        costPerDay: e.costPerDay !== null ? toNumber(e.costPerDay) : null,
        totalHoursWorked: toNumber(e.totalHoursWorked),
    }))

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Equipamentos</h2>
                    <p className="text-muted-foreground">
                        Controle de equipamentos, usos e manutenções
                    </p>
                </div>
                <EquipmentDialog companyId={companyId} />
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Disponíveis</CardTitle>
                        <Truck className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{available}</div>
                        <p className="text-xs text-muted-foreground">Prontos para uso</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Em Uso</CardTitle>
                        <Truck className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{inUse}</div>
                        <p className="text-xs text-muted-foreground">Equipamentos ativos</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Em Manutenção</CardTitle>
                        <Wrench className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{inMaintenance}</div>
                        <p className="text-xs text-muted-foreground">Aguardando manutenção</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Custo Médio/Hora</CardTitle>
                        <DollarSign className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(avgCostPerHour)}
                        </div>
                        <p className="text-xs text-muted-foreground">Equipamentos próprios</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabela */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Lista de Equipamentos
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <EquipmentTable equipment={serializedEquipment} companyId={companyId} />
                </CardContent>
            </Card>
        </div>
    )
}
