'use client'

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
import { MoreHorizontal, Pencil, ArrowUpDown, AlertTriangle, QrCode } from "lucide-react"
import { changeMaterialStatus } from "@/app/actions/inventory-actions"
import { useToast } from "@/hooks/use-toast"
import { MaterialDialog } from "./material-dialog"
import { MovementDialog } from "./movement-dialog"
import Link from "next/link"
import { ExportExcelButton } from "@/components/ui/export-excel-button"

const CATEGORY_LABELS: Record<string, string> = {
    CEMENT: 'Cimento',
    STEEL: 'Aço/Ferro',
    SAND: 'Areia',
    GRAVEL: 'Brita/Pedra',
    BRICK: 'Tijolos/Blocos',
    WOOD: 'Madeira',
    PAINT: 'Tintas',
    ELECTRICAL: 'Elétrico',
    PLUMBING: 'Hidráulico',
    OTHER: 'Outros',
}

interface MaterialsTableProps {
    materials: any[]
    companyId: string
}

export function MaterialsTable({ materials, companyId }: MaterialsTableProps) {
    const { toast } = useToast()
    const [editingMaterial, setEditingMaterial] = useState<any>(null)

    async function handleChangeStatus(id: string, isActive: boolean, name: string) {
        const result = await changeMaterialStatus(id, isActive)
        if (result.success) {
            toast({ title: "Status Alterado", description: `${name} → ${isActive ? 'Ativo' : 'Inativo'}` })
            window.location.reload()
        } else {
            toast({ variant: "destructive", title: "Erro", description: result.error })
        }
    }

    if (materials.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhum material cadastrado ainda.</p>
            </div>
        )
    }

    return (
        <>
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="text-right">Mínimo</TableHead>
                    <TableHead className="text-right">Custo Unit.</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {materials.map((material) => {
                    const isLow = material.currentStock <= material.minStock && material.minStock > 0
                    const isZero = material.currentStock === 0
                    const totalValue = material.currentStock * material.unitCost

                    return (
                        <TableRow key={material.id} className={isZero ? 'bg-red-50' : isLow ? 'bg-orange-50' : ''}>
                            <TableCell className="font-mono text-sm">{material.code}</TableCell>
                            <TableCell className="font-medium">
                                {material.name}
                                {material.supplier && (
                                    <div className="text-xs text-muted-foreground">{material.supplier}</div>
                                )}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="text-xs">
                                    {CATEGORY_LABELS[material.category] || material.category}
                                </Badge>
                            </TableCell>
                            <TableCell>{material.unit}</TableCell>
                            <TableCell className="text-right font-medium">
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-1">
                                        {isLow && <AlertTriangle className="h-3 w-3 text-orange-500" />}
                                        {material.currentStock}
                                    </div>
                                    {material.minStock > 0 && (
                                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${
                                                    isZero ? 'bg-red-500' : isLow ? 'bg-orange-400' : 'bg-green-500'
                                                }`}
                                                style={{ width: `${Math.min(100, (material.currentStock / material.minStock) * 100)}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                                {material.minStock}
                            </TableCell>
                            <TableCell className="text-right">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(material.unitCost)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                            </TableCell>
                            <TableCell>
                                {isZero ? (
                                    <Badge className="bg-red-100 text-red-800">Zerado</Badge>
                                ) : isLow ? (
                                    <Badge className="bg-orange-100 text-orange-800">Baixo</Badge>
                                ) : (
                                    <Badge className="bg-green-100 text-green-800">Normal</Badge>
                                )}
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <MovementDialog
                                            material={material}
                                            companyId={companyId}
                                            trigger={
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                    <ArrowUpDown className="mr-2 h-4 w-4" />
                                                    Movimentar Estoque
                                                </DropdownMenuItem>
                                            }
                                        />
                                        <DropdownMenuItem asChild>
                                            <Link
                                                href={`/estoque/materiais/${material.id}/qrcode`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <QrCode className="mr-2 h-4 w-4" />
                                                Gerar QR Code
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setEditingMaterial(material)}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuSub>
                                            <DropdownMenuSubTrigger>Alterar Status</DropdownMenuSubTrigger>
                                            <DropdownMenuSubContent>
                                                <DropdownMenuItem onSelect={() => handleChangeStatus(material.id, true, material.name)}>
                                                    Ativo
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => handleChangeStatus(material.id, false, material.name)}>
                                                    Inativo
                                                </DropdownMenuItem>
                                            </DropdownMenuSubContent>
                                        </DropdownMenuSub>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        </Table>

        {editingMaterial && (
            <MaterialDialog
                companyId={companyId}
                material={editingMaterial}
                open={!!editingMaterial}
                onOpenChange={(open) => { if (!open) setEditingMaterial(null) }}
            />
        )}
        </>
    )
}
