'use client'
import { useRouter } from 'next/navigation'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { EquipmentDialog } from "./equipment-dialog"
import { deleteEquipment } from "@/app/actions/cost-composition-actions"
import { useToast } from "@/hooks/use-toast"

interface EquipmentEditorProps {
    compositionId: string
    equipment: any[]
}

export function EquipmentEditor({
  compositionId, equipment }: EquipmentEditorProps) {
  const router = useRouter()
    const { toast } = useToast()
    const [editingEquipment, setEditingEquipment] = useState<any | null>(null)
    const [showDialog, setShowDialog] = useState(false)

    async function handleDelete(id: string, description: string) {
        if (!confirm(`Deletar equipamento "${description}"?`)) return

        const result = await deleteEquipment(id)

        if (result.success) {
            toast({
                title: "Equipamento Removido",
                description: `${description} foi removido.`,
            })
            router.refresh()
        } else {
            toast({
                variant: "destructive",
                title: "Erro",
                description: result.error,
            })
        }
    }

    const totalEquipmentCost = equipment.reduce((sum, e) =>
        sum + (Number(e.coefficient) * Number(e.unitCost)), 0
    )

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button
                    onClick={() => {
                        setEditingEquipment(null)
                        setShowDialog(true)
                    }}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Equipamento
                </Button>
            </div>

            {equipment.length === 0 ? (
                <div className="text-center py-12 border rounded-lg">
                    <p className="text-muted-foreground">
                        Nenhum equipamento cadastrado ainda.
                    </p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Unidade</TableHead>
                            <TableHead className="text-right">Coeficiente</TableHead>
                            <TableHead className="text-right">Custo Unit. (R$)</TableHead>
                            <TableHead className="text-right">Total (R$)</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {equipment.map((item) => {
                            const total = Number(item.coefficient) * Number(item.unitCost)
                            return (
                                <TableRow key={item.id}>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell>{item.unit}</TableCell>
                                    <TableCell className="text-right">
                                        {Number(item.coefficient).toFixed(4)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {new Intl.NumberFormat('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL',
                                        }).format(Number(item.unitCost))}
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">
                                        {new Intl.NumberFormat('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL',
                                        }).format(total)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon" aria-label="Editar"
                                                onClick={() => {
                                                    setEditingEquipment(item)
                                                    setShowDialog(true)
                                                }}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon" aria-label="Excluir"
                                                onClick={() => handleDelete(item.id, item.description)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={4} className="text-right font-semibold">
                                Total de Equipamentos:
                            </TableCell>
                            <TableCell className="text-right font-bold text-lg">
                                {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                }).format(totalEquipmentCost)}
                            </TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            )}

            {showDialog && (
                <EquipmentDialog
                    compositionId={compositionId}
                    equipment={editingEquipment}
                    open={showDialog}
                    onOpenChange={setShowDialog}
                />
            )}
        </div>
    )
}
