'use client'

import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export interface Amendment {
    id: string
    number: string
    description: string
    type: string
    oldValue: number | null
    newValue: number | null
    oldEndDate: Date | string | null
    newEndDate: Date | string | null
    justification: string
    approvedAt: Date | string | null
    createdAt: Date | string
}

const typeLabels: Record<string, string> = {
    VALUE_CHANGE: "Valor",
    DEADLINE_CHANGE: "Prazo",
    SCOPE_CHANGE: "Escopo",
    MIXED: "Misto",
}

const typeVariants: Record<string, "default" | "secondary" | "outline"> = {
    VALUE_CHANGE: "default",
    DEADLINE_CHANGE: "secondary",
    SCOPE_CHANGE: "outline",
    MIXED: "default",
}

const brl = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
})

function formatCurrency(value: number | null): string {
    if (value === null || value === undefined) return "—"
    return brl.format(value)
}

function formatDate(value: Date | string | null): string {
    if (value === null || value === undefined) return "—"
    return new Date(value).toLocaleDateString("pt-BR")
}

interface AmendmentsTableProps {
    amendments: Amendment[]
}

export function AmendmentsTable({ amendments }: AmendmentsTableProps) {
    if (amendments.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                Nenhum termo aditivo registrado.
            </div>
        )
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Nº Aditivo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor Anterior</TableHead>
                    <TableHead className="text-right">Valor Novo</TableHead>
                    <TableHead>Prazo Anterior</TableHead>
                    <TableHead>Prazo Novo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {amendments.map((amendment) => (
                    <TableRow key={amendment.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                            {amendment.number}
                        </TableCell>
                        <TableCell>
                            <Badge variant={typeVariants[amendment.type] ?? "outline"}>
                                {typeLabels[amendment.type] ?? amendment.type}
                            </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={amendment.description}>
                            {amendment.description}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                            {formatCurrency(amendment.oldValue)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap font-medium text-green-700">
                            {amendment.newValue !== null ? formatCurrency(amendment.newValue) : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                            {formatDate(amendment.oldEndDate)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-medium">
                            {formatDate(amendment.newEndDate)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                            {formatDate(amendment.createdAt)}
                        </TableCell>
                        <TableCell>
                            {amendment.approvedAt ? (
                                <Badge variant="secondary">Aprovado</Badge>
                            ) : (
                                <Badge variant="outline">Pendente</Badge>
                            )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
