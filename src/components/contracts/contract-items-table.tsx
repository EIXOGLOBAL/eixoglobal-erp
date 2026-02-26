'use client'

import { useState } from "react"
import { ContractItemDialog } from "./contract-item-dialog"
import { deleteContractItem } from "@/app/actions/contract-actions"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Plus, Edit, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ContractItemsTableProps {
    contractId: string
    items: any[]
}

export function ContractItemsTable({ contractId, items }: ContractItemsTableProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState<any>(null)
    const { toast } = useToast()

    async function handleDelete() {
        if (!selectedItem) return

        const result = await deleteContractItem(selectedItem.id)

        if (result.success) {
            toast({
                title: "Item Excluído",
                description: "O item foi removido do contrato.",
            })
            setDeleteDialogOpen(false)
            window.location.reload()
        } else {
            toast({
                variant: "destructive",
                title: "Erro ao Excluir",
                description: result.error,
            })
        }
    }

    // Calcular totais
    const totalContractValue = items.reduce((acc, item) => {
        return acc + (Number(item.quantity) * Number(item.unitPrice))
    }, 0)

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Planilha Orçamentária</CardTitle>
                            <CardDescription>
                                Itens do contrato com quantidades e preços unitários
                            </CardDescription>
                        </div>
                        <ContractItemDialog contractId={contractId} />
                    </div>
                </CardHeader>
                <CardContent>
                    {items && items.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[35%]">Descrição</TableHead>
                                    <TableHead>Unidade</TableHead>
                                    <TableHead className="text-right">Quantidade</TableHead>
                                    <TableHead className="text-right">Medido</TableHead>
                                    <TableHead className="text-right">% Med.</TableHead>
                                    <TableHead className="text-right">Preço Unit. (R$)</TableHead>
                                    <TableHead className="text-right">Total (R$)</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item) => {
                                    const total = Number(item.quantity) * Number(item.unitPrice)
                                    const measured = Number(item.measuredQuantity || 0)
                                    const pctMed = item.quantity > 0 ? (measured / Number(item.quantity)) * 100 : 0
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">
                                                {item.description}
                                            </TableCell>
                                            <TableCell>{item.unit}</TableCell>
                                            <TableCell className="text-right">
                                                {new Intl.NumberFormat('pt-BR', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                }).format(Number(item.quantity))}
                                            </TableCell>
                                            <TableCell className="text-right text-blue-700 font-medium">
                                                {measured > 0
                                                    ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(measured)
                                                    : <span className="text-muted-foreground text-sm">—</span>
                                                }
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {measured > 0 ? (
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className={`text-xs font-medium ${pctMed >= 100 ? 'text-green-700' : pctMed > 70 ? 'text-orange-600' : 'text-blue-600'}`}>
                                                            {pctMed.toFixed(1)}%
                                                        </span>
                                                        <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${pctMed >= 100 ? 'bg-green-500' : pctMed > 70 ? 'bg-orange-400' : 'bg-blue-500'}`}
                                                                style={{ width: `${Math.min(100, pctMed)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">0%</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {new Intl.NumberFormat('pt-BR', {
                                                    style: 'currency',
                                                    currency: 'BRL',
                                                }).format(Number(item.unitPrice))}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {new Intl.NumberFormat('pt-BR', {
                                                    style: 'currency',
                                                    currency: 'BRL',
                                                }).format(total)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <ContractItemDialog
                                                        contractId={contractId}
                                                        item={item}
                                                        trigger={
                                                            <Button variant="ghost" size="sm">
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                        }
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:text-destructive"
                                                        onClick={() => {
                                                            setSelectedItem(item)
                                                            setDeleteDialogOpen(true)
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground mb-4">
                                Nenhum item cadastrado neste contrato.
                            </p>
                            <ContractItemDialog contractId={contractId} />
                        </div>
                    )}
                </CardContent>
                {items && items.length > 0 && (
                    <CardFooter className="border-t bg-muted/50">
                        <div className="w-full flex justify-between items-center">
                            <div className="text-sm text-muted-foreground">
                                Total de {items.length} {items.length === 1 ? 'item' : 'itens'}
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-muted-foreground mb-1">
                                    Valor Total do Contrato
                                </div>
                                <div className="text-2xl font-bold text-green-700">
                                    {new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL',
                                    }).format(totalContractValue)}
                                </div>
                            </div>
                        </div>
                    </CardFooter>
                )}
            </Card>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir o item <strong>{selectedItem?.description}</strong>?
                            Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
