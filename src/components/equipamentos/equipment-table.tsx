'use client'
import { useRouter } from 'next/navigation'

import { useState } from "react"
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { MoreHorizontal, Eye } from "lucide-react"
import Link from "next/link"
import { updateEquipmentStatus } from "@/app/actions/equipment-actions"
import { useToast } from "@/hooks/use-toast"
import { EquipmentDialog } from "./equipment-dialog"
import { EquipmentIcon } from "@/lib/equipment-icons"
import { ExportButton } from "@/components/ui/export-button"
import type { ExportColumn } from "@/lib/export-utils"

const equipmentExportColumns: ExportColumn[] = [
    { key: 'code', label: 'Codigo' },
    { key: 'name', label: 'Nome' },
    { key: 'typePtBr', label: 'Tipo' },
    { key: 'brandModel', label: 'Marca / Modelo' },
    { key: 'statusPtBr', label: 'Status' },
    { key: 'costPerHourFmt', label: 'Custo/h', format: (v) => String(v ?? '') },
    { key: 'costPerDayFmt', label: 'Custo/dia', format: (v) => String(v ?? '') },
    { key: 'possePtBr', label: 'Posse' },
]

export const EQUIPMENT_TYPE_LABELS: Record<string, string> = {
    VEHICLE: "Veículo",
    CRANE: "Guindaste/Grua",
    EXCAVATOR: "Escavadeira",
    CONCRETE_MIXER: "Betoneira",
    COMPRESSOR: "Compressor",
    GENERATOR: "Gerador",
    SCAFFOLD: "Andaime",
    FORMWORK: "Forma/Escoramento",
    PUMP: "Bomba",
    TOOL: "Ferramenta",
    OTHER: "Outro",
}

export const EQUIPMENT_STATUS_LABELS: Record<string, string> = {
    AVAILABLE: "Disponível",
    IN_USE: "Em Uso",
    MAINTENANCE: "Em Manutenção",
    INACTIVE: "Inativo",
    RENTED_OUT: "Locado",
}

const STATUS_COLORS: Record<string, string> = {
    AVAILABLE: "bg-green-100 text-green-800 border-green-200",
    IN_USE: "bg-blue-100 text-blue-800 border-blue-200",
    MAINTENANCE: "bg-orange-100 text-orange-800 border-orange-200",
    INACTIVE: "bg-gray-100 text-gray-800 border-gray-200",
    RENTED_OUT: "bg-purple-100 text-purple-800 border-purple-200",
}

type Equipment = {
    id: string
    code: string
    name: string
    type: string
    brand: string | null
    model: string | null
    year: number | null
    status: string
    costPerHour: number | null
    costPerDay: number | null
    isOwned: boolean
    notes: string | null
    companyId: string
    _count: { usages: number; maintenances: number }
}

interface EquipmentTableProps {
    equipment: Equipment[]
    companyId: string
}

export function EquipmentTable({
  equipment, companyId }: EquipmentTableProps) {
  const router = useRouter()
    const [typeFilter, setTypeFilter] = useState<string>('ALL')
    const [statusFilter, setStatusFilter] = useState<string>('ALL')
    const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null)
    const { toast } = useToast()

    const filtered = equipment.filter(eq => {
        if (typeFilter !== 'ALL' && eq.type !== typeFilter) return false
        if (statusFilter !== 'ALL' && eq.status !== statusFilter) return false
        return true
    })

    async function handleChangeStatus(id: string, status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'INACTIVE' | 'RENTED_OUT', name: string) {
        const result = await updateEquipmentStatus(id, status)
        if (result.success) {
            toast({ title: "Status Alterado", description: `"${name}" → ${EQUIPMENT_STATUS_LABELS[status]}` })
            router.refresh()
        } else {
            toast({ title: "Erro", description: result.error ?? "Erro ao alterar status", variant: "destructive" })
        }
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filtrar por tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todos os tipos</SelectItem>
                        {Object.entries(EQUIPMENT_TYPE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todos os status</SelectItem>
                        {Object.entries(EQUIPMENT_STATUS_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {(typeFilter !== 'ALL' || statusFilter !== 'ALL') && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setTypeFilter('ALL'); setStatusFilter('ALL') }}
                    >
                        Limpar filtros
                    </Button>
                )}

                <ExportButton
                    data={filtered.map(eq => ({
                        ...eq,
                        typePtBr: EQUIPMENT_TYPE_LABELS[eq.type] ?? eq.type,
                        brandModel: [eq.brand, eq.model].filter(Boolean).join(' / ') || '',
                        statusPtBr: EQUIPMENT_STATUS_LABELS[eq.status] ?? eq.status,
                        costPerHourFmt: eq.costPerHour != null
                            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(eq.costPerHour)
                            : '',
                        costPerDayFmt: eq.costPerDay != null
                            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(eq.costPerDay)
                            : '',
                        possePtBr: eq.isOwned ? 'Proprio' : 'Locado',
                    }))}
                    columns={equipmentExportColumns}
                    filename="equipamentos"
                    title="Equipamentos"
                    sheetName="Equipamentos"
                    size="sm"
                />
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-14"></TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Marca/Modelo</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Custo/h</TableHead>
                            <TableHead>Posse</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                                    Nenhum equipamento encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map(eq => (
                                <TableRow key={eq.id}>
                                    <TableCell>
                                    <EquipmentIcon type={eq.type} size="sm" />
                                </TableCell>
                                <TableCell className="font-mono text-sm">{eq.code}</TableCell>
                                    <TableCell className="font-medium">{eq.name}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {EQUIPMENT_TYPE_LABELS[eq.type] ?? eq.type}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {[eq.brand, eq.model].filter(Boolean).join(' / ') || '—'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={STATUS_COLORS[eq.status] ?? ''}
                                        >
                                            {EQUIPMENT_STATUS_LABELS[eq.status] ?? eq.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {eq.costPerHour != null
                                            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(eq.costPerHour)
                                            : '—'}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        <Badge variant={eq.isOwned ? "default" : "secondary"}>
                                            {eq.isOwned ? "Próprio" : "Locado"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" aria-label="Abrir menu de ações">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/equipamentos/${eq.id}`}>
                                                        <Eye className="h-4 w-4 mr-2" />
                                                        Ver Detalhes
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => setEditingEquipment(eq)}>
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuSub>
                                                    <DropdownMenuSubTrigger>Alterar Status</DropdownMenuSubTrigger>
                                                    <DropdownMenuSubContent>
                                                        <DropdownMenuItem onSelect={() => handleChangeStatus(eq.id, 'AVAILABLE', eq.name)}>
                                                            Disponível
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleChangeStatus(eq.id, 'IN_USE', eq.name)}>
                                                            Em Uso
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleChangeStatus(eq.id, 'MAINTENANCE', eq.name)}>
                                                            Em Manutenção
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleChangeStatus(eq.id, 'INACTIVE', eq.name)}>
                                                            Inativo
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onSelect={() => handleChangeStatus(eq.id, 'RENTED_OUT', eq.name)}>
                                                            Locado
                                                        </DropdownMenuItem>
                                                    </DropdownMenuSubContent>
                                                </DropdownMenuSub>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {editingEquipment && (
                <EquipmentDialog
                    companyId={companyId}
                    equipment={editingEquipment}
                    open={!!editingEquipment}
                    onOpenChange={(open) => { if (!open) setEditingEquipment(null) }}
                />
            )}
        </div>
    )
}
