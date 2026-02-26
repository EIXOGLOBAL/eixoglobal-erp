'use client'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Check, MoreHorizontal, X, Loader2, CheckCheck } from "lucide-react"
import { useState, useTransition } from "react"
import { approveMeasurement, rejectMeasurement, bulkApproveMeasurements } from "@/app/actions/measurement-actions"
import { useToast } from "@/hooks/use-toast"

interface Measurement {
    id: string
    date: Date
    quantity: number
    description: string | null
    status: string
    project: { name: string; id: string }
    employee: { name: string; id: string } | null
    contractItem: {
        description: string
        unit: string
        unitPrice: number
    }
}

interface MeasurementsApprovalTableProps {
    data: Measurement[]
}

export function MeasurementsApprovalTable({ data }: MeasurementsApprovalTableProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isPending, startTransition] = useTransition()
    const { toast } = useToast()

    // Rejection Dialog State
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
    const [itemToReject, setItemToReject] = useState<string | null>(null)
    const [rejectionReason, setRejectionReason] = useState("")

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === data.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(data.map(m => m.id))
        }
    }

    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id))
        } else {
            setSelectedIds([...selectedIds, id])
        }
    }

    const handleApprove = (id: string) => {
        startTransition(async () => {
            const result = await approveMeasurement(id)
            if (result.success) {
                toast({ title: "Aprovado", description: "Medição aprovada com sucesso." })
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        })
    }

    const handleRejectClick = (id: string) => {
        setItemToReject(id)
        setRejectionReason("")
        setRejectDialogOpen(true)
    }

    const confirmReject = () => {
        if (!itemToReject || !rejectionReason.trim()) return

        startTransition(async () => {
            const result = await rejectMeasurement(itemToReject, rejectionReason)
            if (result.success) {
                toast({ title: "Rejeitado", description: "Medição rejeitada." })
                setRejectDialogOpen(false)
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        })
    }

    const handleBulkApprove = () => {
        if (selectedIds.length === 0) return

        startTransition(async () => {
            const result = await bulkApproveMeasurements(selectedIds)
            if (result.success) {
                toast({ title: "Sucesso", description: `${selectedIds.length} medições aprovadas.` })
                setSelectedIds([])
            } else {
                toast({ variant: "destructive", title: "Erro", description: result.error })
            }
        })
    }

    return (
        <div className="space-y-4">
            {/* Bulk Actions Header */}
            {selectedIds.length > 0 && (
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border">
                    <span className="text-sm font-medium">{selectedIds.length} selecionado(s)</span>
                    <Button size="sm" onClick={handleBulkApprove} disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCheck className="mr-2 h-4 w-4" />}
                        Aprovar Selecionadas
                    </Button>
                </div>
            )}

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={data.length > 0 && selectedIds.length === data.length}
                                    onCheckedChange={toggleSelectAll}
                                />
                            </TableHead>
                            <TableHead className="w-[100px]">Data</TableHead>
                            <TableHead>Projeto</TableHead>
                            <TableHead>Colaborador</TableHead>
                            <TableHead>Descrição/Item</TableHead>
                            <TableHead className="text-right">Qtd / Unid</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead className="w-[100px] text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                    Nenhuma medição aguardando aprovação.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((m) => (
                                <TableRow key={m.id}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedIds.includes(m.id)}
                                            onCheckedChange={() => toggleSelect(m.id)}
                                        />
                                    </TableCell>
                                    <TableCell>{format(new Date(m.date), 'dd/MM/yy')}</TableCell>
                                    <TableCell className="font-medium">{m.project.name}</TableCell>
                                    <TableCell>{m.employee?.name || "-"}</TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={m.description || ""}>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-semibold text-muted-foreground">{m.contractItem.description}</span>
                                            <span>{m.description}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {Number(m.quantity).toLocaleString('pt-BR')} <span className="text-xs text-muted-foreground">{m.contractItem.unit}</span>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {formatCurrency(Number(m.quantity) * Number(m.contractItem.unitPrice))}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleApprove(m.id)} disabled={isPending}>
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleRejectClick(m.id)} disabled={isPending}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Rejection Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rejeitar Medição</DialogTitle>
                        <DialogDescription>
                            Informe o motivo da rejeição para o colaborador.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder="Ex: Quantidade incorreta, falha na execução..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={confirmReject} disabled={!rejectionReason.trim() || isPending}>
                            Confirmar Rejeição
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
