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

export interface Adjustment {
    id: string
    indexType: string
    baseDate: Date | string
    adjustmentDate: Date | string
    oldIndex: number
    newIndex: number
    percentage: number
    createdAt: Date | string
}

function formatDate(value: Date | string): string {
    return new Date(value).toLocaleDateString("pt-BR")
}

interface AdjustmentsTableProps {
    adjustments: Adjustment[]
}

export function AdjustmentsTable({ adjustments }: AdjustmentsTableProps) {
    if (adjustments.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                Nenhum reajuste registrado.
            </div>
        )
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Índice</TableHead>
                    <TableHead>Data Base</TableHead>
                    <TableHead>Data Reajuste</TableHead>
                    <TableHead className="text-right">Índice Anterior</TableHead>
                    <TableHead className="text-right">Índice Novo</TableHead>
                    <TableHead className="text-right">Percentual</TableHead>
                    <TableHead>Data do Cálculo</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {adjustments.map((adjustment) => (
                    <TableRow key={adjustment.id}>
                        <TableCell>
                            <Badge>{adjustment.indexType}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                            {formatDate(adjustment.baseDate)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                            {formatDate(adjustment.adjustmentDate)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                            {adjustment.oldIndex.toFixed(4)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                            {adjustment.newIndex.toFixed(4)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap font-bold text-green-700">
                            +{adjustment.percentage.toFixed(4)}%
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                            {formatDate(adjustment.createdAt)}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
