'use client'

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Loader2, FileText } from "lucide-react"
import { closeBillingAction } from "@/app/actions/billing-actions"
import { useToast } from "@/hooks/use-toast"

interface Measurement {
    id: string
    date: Date
    quantity: number // Prisma Decimal mapped to number usually or string. Let's assume number per payload
    contractItem: {
        description: string
        unitPrice: number // Decimal
        unit: string
    }
    project: {
        name: string
    }
    status: string
}

interface BillingSelectionTableProps {
    measurements: Measurement[]
}

export function BillingSelectionTable({ measurements }: BillingSelectionTableProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isPending, startTransition] = useTransition()
    const { toast } = useToast()
    const router = useRouter()

    // Calculate total of selected items
    const selectedMeasurements = measurements.filter(m => selectedIds.includes(m.id))
    const totalValue = selectedMeasurements.reduce((acc, m) => {
        return acc + (Number(m.quantity) * Number(m.contractItem.unitPrice))
    }, 0)

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const toggleAll = () => {
        if (selectedIds.length === measurements.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(measurements.map(m => m.id))
        }
    }

    const handleBilling = () => {
        if (selectedIds.length === 0) return

        startTransition(async () => {
            const result = await closeBillingAction({ measurementIds: selectedIds })
            if (result.success && result.data) {
                toast({
                    title: "Pré-Nota Fiscal Gerada!",
                    description: "Redirecionando para a nota...",
                })
                setSelectedIds([]) // Clear selection
                router.push(`/dashboard/financeiro/notas/${result.data.id}`)
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro ao faturar",
                    description: result.error
                })
            }
        })
    }

    return (
        <div className="relative pb-24">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={measurements.length > 0 && selectedIds.length === measurements.length}
                                    onCheckedChange={toggleAll}
                                />
                            </TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Projeto</TableHead>
                            <TableHead>Serviço</TableHead>
                            <TableHead className="text-right">Qtd</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {measurements.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    Nenhuma medição aprovada disponível para faturamento.
                                </TableCell>
                            </TableRow>
                        ) : (
                            measurements.map((m) => (
                                <TableRow key={m.id}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedIds.includes(m.id)}
                                            onCheckedChange={() => toggleSelection(m.id)}
                                        />
                                    </TableCell>
                                    <TableCell>{format(m.date, 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                                    <TableCell>{m.project.name}</TableCell>
                                    <TableCell>{m.contractItem.description}</TableCell>
                                    <TableCell className="text-right">
                                        {Number(m.quantity).toLocaleString('pt-BR')} {m.contractItem.unit}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {(Number(m.quantity) * Number(m.contractItem.unitPrice)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="default">Aprovado</Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Floating Footer */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl bg-background border shadow-xl rounded-lg p-4 flex items-center justify-between animate-in slide-in-from-bottom-5">
                    <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">
                            {selectedIds.length} item(s) selecionado(s)
                        </span>
                        <span className="text-xl font-bold text-primary">
                            Total: {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                    <Button size="lg" onClick={handleBilling} disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                        Gerar Pré-Nota Fiscal
                    </Button>
                </div>
            )}
        </div>
    )
}
