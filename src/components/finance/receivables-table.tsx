'use client'

import { useState } from "react"
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, DollarSign, AlertCircle } from "lucide-react"
import { PaymentDialog } from "./payment-dialog"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface FinancialRecord {
    id: string
    description: string
    amount: number
    paidAmount: number
    status: string
    dueDate: Date
    paidDate?: Date | null
    fiscalNote?: {
        number: string
        series?: string | null
    } | null
}

interface ReceivablesTableProps {
    data: FinancialRecord[]
    bankAccounts: { id: string; name: string }[]
}

export function ReceivablesTable({ data, bankAccounts }: ReceivablesTableProps) {
    const [selectedRecord, setSelectedRecord] = useState<FinancialRecord | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    const getStatusBadge = (record: FinancialRecord) => {
        const isOverdue = new Date(record.dueDate) < new Date() && record.status !== 'PAID'

        if (record.status === 'PAID') {
            return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-none">PAGO</Badge>
        }

        if (isOverdue) {
            return <Badge variant="destructive" className="items-center gap-1"><AlertCircle className="h-3 w-3" /> VENCIDO</Badge>
        }

        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">ABERTO</Badge>
    }

    const handlePaymentClick = (record: FinancialRecord) => {
        setSelectedRecord(record)
        setDialogOpen(true)
    }

    return (
        <>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">Vencimento</TableHead>
                            <TableHead>Descrição / Cliente</TableHead>
                            <TableHead>Nota Fiscal</TableHead>
                            <TableHead className="text-right">Valor Original</TableHead>
                            <TableHead className="text-right">Valor Pago</TableHead>
                            <TableHead className="text-right">Saldo Devedor</TableHead>
                            <TableHead className="text-center w-[100px]">Status</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                    Nenhum registro encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((record) => {
                                const balance = record.amount - record.paidAmount

                                return (
                                    <TableRow key={record.id}>
                                        <TableCell className="font-medium">
                                            {format(new Date(record.dueDate), 'dd/MM/yyyy')}
                                        </TableCell>
                                        <TableCell>
                                            {record.description}
                                            {/* Ideally we show Customer Name, but FiscalNote relation might not have it directly if not linked to Project -> Company properly. Using description derived from Billing step. */}
                                        </TableCell>
                                        <TableCell>
                                            {record.fiscalNote ? `${record.fiscalNote.number}${record.fiscalNote.series ? `/${record.fiscalNote.series}` : ''}` : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(record.amount)}
                                        </TableCell>
                                        <TableCell className="text-right text-green-600">
                                            {formatCurrency(record.paidAmount)}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-slate-700">
                                            {formatCurrency(balance)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {getStatusBadge(record)}
                                        </TableCell>
                                        <TableCell>
                                            {record.status !== 'PAID' && (
                                                <div className="flex justify-end">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-0"
                                                        onClick={() => handlePaymentClick(record)}
                                                        title="Registrar Pagamento"
                                                    >
                                                        <DollarSign className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {selectedRecord && (
                <PaymentDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    record={selectedRecord}
                    bankAccounts={bankAccounts}
                />
            )}
        </>
    )
}
