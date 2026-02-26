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
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CreateMeasurementDialog } from "./create-measurement-dialog"

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

interface MeasurementsDataTableProps {
    data: Measurement[]
    projects: { id: string; name: string }[]
    employees: { id: string; name: string }[]
}

export function MeasurementsDataTable({ data, projects, employees }: MeasurementsDataTableProps) {

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'SUBMITTED': // PENDENTE
                return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-none">PENDENTE</Badge>
            case 'APPROVED':
                return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-none">APROVADO</Badge>
            case 'BILLED': // FATURADO
            case 'PAID':
                return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-none">FATURADO</Badge>
            case 'REJECTED':
                return <Badge variant="destructive">REJEITADO</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <CreateMeasurementDialog projects={projects} employees={employees} />
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">Data</TableHead>
                            <TableHead>Projeto</TableHead>
                            <TableHead>Colaborador</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-right">Qtd / Unid</TableHead>
                            <TableHead className="text-right">Valor Total</TableHead>
                            <TableHead className="text-center w-[120px]">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    Nenhuma medição encontrada.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((m) => (
                                <TableRow key={m.id}>
                                    <TableCell>{format(new Date(m.date), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                                    <TableCell className="font-medium">{m.project.name}</TableCell>
                                    <TableCell>{m.employee?.name || "-"}</TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={m.description || ""}>
                                        {m.description || m.contractItem.description}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {Number(m.quantity).toLocaleString('pt-BR')} <span className="text-xs text-muted-foreground">{m.contractItem.unit}</span>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-green-600">
                                        {formatCurrency(Number(m.quantity) * Number(m.contractItem.unitPrice))}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {getStatusBadge(m.status)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
