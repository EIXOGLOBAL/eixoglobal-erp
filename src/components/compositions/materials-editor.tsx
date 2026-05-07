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
import { MaterialDialog } from "./material-dialog"
import { deleteMaterial } from "@/app/actions/cost-composition-actions"
import { useToast } from "@/hooks/use-toast"

interface MaterialsEditorProps {
    compositionId: string
    materials: any[]
}

export function MaterialsEditor({
  compositionId, materials }: MaterialsEditorProps) {
  const router = useRouter()
    const { toast } = useToast()
    const [editingMaterial, setEditingMaterial] = useState<any | null>(null)
    const [showDialog, setShowDialog] = useState(false)

    async function handleDelete(id: string, description: string) {
        if (!confirm(`Deletar material "${description}"?`)) return

        const result = await deleteMaterial(id)

        if (result.success) {
            toast({
                title: "Material Removido",
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

    const totalMaterialsCost = materials.reduce((sum, m) =>
        sum + (Number(m.coefficient) * Number(m.unitCost)), 0
    )

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button
                    onClick={() => {
                        setEditingMaterial(null)
                        setShowDialog(true)
                    }}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Material
                </Button>
            </div>

            {materials.length === 0 ? (
                <div className="text-center py-12 border rounded-lg">
                    <p className="text-muted-foreground">
                        Nenhum material cadastrado ainda.
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
                        {materials.map((material) => {
                            const total = Number(material.coefficient) * Number(material.unitCost)
                            return (
                                <TableRow key={material.id}>
                                    <TableCell>{material.description}</TableCell>
                                    <TableCell>{material.unit}</TableCell>
                                    <TableCell className="text-right">
                                        {Number(material.coefficient).toFixed(4)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {new Intl.NumberFormat('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL',
                                        }).format(Number(material.unitCost))}
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
                                                    setEditingMaterial(material)
                                                    setShowDialog(true)
                                                }}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon" aria-label="Excluir"
                                                onClick={() => handleDelete(material.id, material.description)}
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
                                Total de Materiais:
                            </TableCell>
                            <TableCell className="text-right font-bold text-lg">
                                {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                }).format(totalMaterialsCost)}
                            </TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            )}

            {showDialog && (
                <MaterialDialog
                    compositionId={compositionId}
                    material={editingMaterial}
                    open={showDialog}
                    onOpenChange={setShowDialog}
                />
            )}
        </div>
    )
}
