'use client'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { endUsage } from "@/app/actions/equipment-actions"
import { useToast } from "@/hooks/use-toast"

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d: Date | string | null | undefined) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : '—'

const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
    PREVENTIVE: "Preventiva",
    CORRECTIVE: "Corretiva",
    INSPECTION: "Inspeção",
}

interface UsageRow {
    id: string
    projectName: string
    startDate: Date
    endDate: Date | null
    hours: number | null
    days: number | null
    totalCost: number | null
    operator: string | null
}

interface MaintenanceRow {
    id: string
    type: string
    description: string
    scheduledAt: Date
    completedAt: Date | null
    cost: number | null
    provider: string | null
}

interface Props {
    usages: UsageRow[]
    maintenances: MaintenanceRow[]
    equipmentId: string
    activeTab: 'usage' | 'maintenance'
}

export function EquipmentDetailClient({ usages, equipmentId, activeTab }: Props) {
    const { toast } = useToast()

    async function handleEndUsage(usageId: string) {
        if (!confirm('Encerrar este uso agora?')) return

        const result = await endUsage(usageId, new Date().toISOString())
        if (result.success) {
            toast({ title: "Uso encerrado", description: "O uso foi encerrado e o equipamento está disponível." })
        } else {
            toast({ title: "Erro", description: result.error ?? "Erro ao encerrar uso", variant: "destructive" })
        }
    }

    if (activeTab !== 'usage') return null

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 pr-4">Projeto</th>
                        <th className="text-left py-2 pr-4">Início</th>
                        <th className="text-left py-2 pr-4">Término</th>
                        <th className="text-right py-2 pr-4">Horas</th>
                        <th className="text-right py-2 pr-4">Dias</th>
                        <th className="text-right py-2 pr-4">Custo Total</th>
                        <th className="text-left py-2 pr-4">Operador</th>
                        <th className="text-center py-2">Status</th>
                        <th className="text-center py-2">Ação</th>
                    </tr>
                </thead>
                <tbody>
                    {usages.map(u => (
                        <tr key={u.id} className="border-b last:border-0">
                            <td className="py-2 pr-4 font-medium">{u.projectName}</td>
                            <td className="py-2 pr-4 text-muted-foreground">{fmtDate(u.startDate)}</td>
                            <td className="py-2 pr-4 text-muted-foreground">{fmtDate(u.endDate)}</td>
                            <td className="py-2 pr-4 text-right">{u.hours ?? '—'}</td>
                            <td className="py-2 pr-4 text-right">{u.days ?? '—'}</td>
                            <td className="py-2 pr-4 text-right">
                                {u.totalCost != null ? fmt.format(u.totalCost) : '—'}
                            </td>
                            <td className="py-2 pr-4 text-muted-foreground">{u.operator ?? '—'}</td>
                            <td className="py-2 text-center">
                                {u.endDate ? (
                                    <Badge className="bg-green-100 text-green-800 border-green-200" variant="outline">Concluído</Badge>
                                ) : (
                                    <Badge className="bg-blue-100 text-blue-800 border-blue-200" variant="outline">Em Andamento</Badge>
                                )}
                            </td>
                            <td className="py-2 text-center">
                                {!u.endDate && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs h-7"
                                        onClick={() => handleEndUsage(u.id)}
                                    >
                                        Encerrar
                                    </Button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
