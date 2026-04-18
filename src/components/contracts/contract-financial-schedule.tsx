'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter,
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
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { deleteFinancialScheduleItem } from "@/app/actions/financial-schedule-actions"
import { ScheduleItemDialog, type ScheduleItemData } from "./schedule-item-dialog"
import { formatCurrency, formatPercent, formatDate, toNumber } from "@/lib/formatters"
import { Pencil, Trash2, Loader2, CalendarDays } from "lucide-react"

export interface ScheduleItem {
    id: string
    month: number
    percentage: number | string
    value: number | string
    dueDate: string | Date | null
    createdAt: string | Date
}

interface ContractFinancialScheduleProps {
    contractId: string
    items: ScheduleItem[]
    contractValue?: number
}

export function ContractFinancialSchedule({
    contractId,
    items,
    contractValue = 0,
}: ContractFinancialScheduleProps) {
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const { toast } = useToast()
    const router = useRouter()

    const totalValue = items.reduce((sum, item) => sum + toNumber(item.value), 0)
    const totalPercentage = items.reduce((sum, item) => sum + toNumber(item.percentage), 0)

    async function handleDelete(id: string) {
        setDeletingId(id)
        try {
            const result = await deleteFinancialScheduleItem(id)
            if (result.success) {
                toast({
                    title: "Parcela excluída",
                    description: "A parcela foi removida do cronograma financeiro.",
                })
                router.refresh()
            } else {
                toast({
                    title: "Erro",
                    description: result.error || "Erro ao excluir a parcela.",
                    variant: "destructive",
                })
            }
        } catch {
            toast({
                title: "Erro",
                description: "Erro inesperado ao excluir a parcela.",
                variant: "destructive",
            })
        } finally {
            setDeletingId(null)
        }
    }

    function getStatusBadge(item: ScheduleItem) {
        const value = toNumber(item.value)
        const now = new Date()
        const dueDate = item.dueDate ? new Date(item.dueDate) : null

        if (dueDate && dueDate < now) {
            return <Badge variant="destructive">Vencida</Badge>
        }
        if (dueDate) {
            const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            if (daysUntilDue <= 30) {
                return <Badge variant="default">A vencer</Badge>
            }
        }
        if (value > 0) {
            return <Badge variant="outline">Prevista</Badge>
        }
        return <Badge variant="secondary">Pendente</Badge>
    }

    function itemToEditData(item: ScheduleItem): ScheduleItemData {
        return {
            id: item.id,
            month: item.month,
            percentage: toNumber(item.percentage),
            value: toNumber(item.value),
            dueDate: item.dueDate,
        }
    }

    if (items.length === 0) {
        return (
            <div className="space-y-4">
                <div className="flex justify-end">
                    <ScheduleItemDialog contractId={contractId} />
                </div>
                <div className="text-center py-12 text-muted-foreground">
                    <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium mb-1">Nenhuma parcela cadastrada</p>
                    <p className="text-sm">
                        Adicione parcelas ao cronograma financeiro deste contrato.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Header com resumo e botão */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                        <strong className="text-foreground">{items.length}</strong>{" "}
                        {items.length === 1 ? "parcela" : "parcelas"}
                    </span>
                    <span>
                        Total: <strong className="text-foreground">{formatCurrency(totalValue)}</strong>
                    </span>
                    <span>
                        Cobertura: <strong className="text-foreground">{formatPercent(totalPercentage)}</strong>
                    </span>
                    {contractValue > 0 && totalValue !== contractValue && (
                        <Badge variant={totalValue > contractValue ? "destructive" : "outline"} className="text-xs">
                            {totalValue > contractValue
                                ? `Excede ${formatCurrency(totalValue - contractValue)}`
                                : `Faltam ${formatCurrency(contractValue - totalValue)}`}
                        </Badge>
                    )}
                </div>
                <ScheduleItemDialog contractId={contractId} />
            </div>

            {/* Tabela */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Mês</TableHead>
                            <TableHead className="text-right">Percentual</TableHead>
                            <TableHead className="text-right">Valor Previsto</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right w-[100px]">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">
                                    Mês {item.month}
                                </TableCell>
                                <TableCell className="text-right">
                                    {formatPercent(item.percentage)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                    {formatCurrency(item.value)}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                    {item.dueDate ? formatDate(item.dueDate) : "—"}
                                </TableCell>
                                <TableCell>
                                    {getStatusBadge(item)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <ScheduleItemDialog
                                            contractId={contractId}
                                            item={itemToEditData(item)}
                                            trigger={
                                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Editar">
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                            }
                                        />
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
 variant="ghost"
 size="icon" aria-label="Excluir parcela" 
 className="h-8 w-8 text-destructive hover:text-destructive"
 disabled={deletingId === item.id}
>
                                                    {deletingId === item.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    )}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Excluir parcela</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Tem certeza que deseja excluir a parcela do Mês {item.month}?
                                                        Esta ação não pode ser desfeita.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleDelete(item.id)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >
                                                        Excluir
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell className="font-bold">Total</TableCell>
                            <TableCell className="text-right font-bold">
                                {formatPercent(totalPercentage)}
                            </TableCell>
                            <TableCell className="text-right font-bold">
                                {formatCurrency(totalValue)}
                            </TableCell>
                            <TableCell colSpan={3} />
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </div>
    )
}
