'use client'

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
import { LaborDialog } from "./labor-dialog"
import { deleteLabor } from "@/app/actions/cost-composition-actions"
import { useToast } from "@/hooks/use-toast"

interface LaborEditorProps {
    compositionId: string
    labor: any[]
}

export function LaborEditor({ compositionId, labor }: LaborEditorProps) {
    const { toast } = useToast()
    const [editingLabor, setEditingLabor] = useState<any | null>(null)
    const [showDialog, setShowDialog] = useState(false)

    async function handleDelete(id: string, description: string) {
        if (!confirm(`Deletar mão de obra "${description}"?`)) return

        const result = await deleteLabor(id)

        if (result.success) {
            toast({
                title: "Mão de Obra Removida",
                description: `${description} foi removida.`,
            })
            window.location.reload()
        } else {
            toast({
                variant: "destructive",
                title: "Erro",
                description: result.error,
            })
        }
    }

    const totalLaborCost = labor.reduce((sum, l) =>
        sum + (Number(l.hours) * Number(l.hourlyRate)), 0
    )

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button
                    onClick={() => {
                        setEditingLabor(null)
                        setShowDialog(true)
                    }}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Mão de Obra
                </Button>
            </div>

            {labor.length === 0 ? (
                <div className="text-center py-12 border rounded-lg">
                    <p className="text-muted-foreground">
                        Nenhuma mão de obra cadastrada ainda.
                    </p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-right">Horas</TableHead>
                            <TableHead className="text-right">Valor/Hora (R$)</TableHead>
                            <TableHead className="text-right">Total (R$)</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {labor.map((item) => {
                            const total = Number(item.hours) * Number(item.hourlyRate)
                            return (
                                <TableRow key={item.id}>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell className="text-right">
                                        {Number(item.hours).toFixed(4)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {new Intl.NumberFormat('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL',
                                        }).format(Number(item.hourlyRate))}
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
                                                    setEditingLabor(item)
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
                            <TableCell colSpan={3} className="text-right font-semibold">
                                Total de Mão de Obra:
                            </TableCell>
                            <TableCell className="text-right font-bold text-lg">
                                {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                }).format(totalLaborCost)}
                            </TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            )}

            {showDialog && (
                <LaborDialog
                    compositionId={compositionId}
                    labor={editingLabor}
                    open={showDialog}
                    onOpenChange={setShowDialog}
                />
            )}
        </div>
    )
}
