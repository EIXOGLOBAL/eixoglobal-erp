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
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface BulletinItemEnhanced {
    id: string
    itemCode?: string | null
    description: string
    unit: string
    unitPrice: number
    contractedQuantity: number
    previousMeasured: number
    currentMeasured: number
    accumulatedMeasured: number
    balanceQuantity: number
    currentValue: number
    accumulatedValue: number
    percentageExecuted: number
}

interface BulletinItemsTableEnhancedProps {
    items: BulletinItemEnhanced[]
    bulletinStatus: string
}

export function BulletinItemsTableEnhanced({
    items,
    bulletinStatus,
}: BulletinItemsTableEnhancedProps) {
    const canEdit = bulletinStatus === 'DRAFT' || bulletinStatus === 'REJECTED'

    // Calculate totals
    const totals = {
        contractedQuantity: items.reduce((sum, item) => sum + item.contractedQuantity, 0),
        previousMeasured: items.reduce((sum, item) => sum + item.previousMeasured, 0),
        currentMeasured: items.reduce((sum, item) => sum + item.currentMeasured, 0),
        accumulatedMeasured: items.reduce((sum, item) => sum + item.accumulatedMeasured, 0),
        balanceQuantity: items.reduce((sum, item) => sum + item.balanceQuantity, 0),
        currentValue: items.reduce((sum, item) => sum + item.currentValue, 0),
        accumulatedValue: items.reduce((sum, item) => sum + item.accumulatedValue, 0),
    }

    // Helper to get status color for percentage
    function getPercentageColor(percentage: number) {
        if (percentage >= 100) return 'bg-red-100 text-red-900'
        if (percentage >= 90) return 'bg-yellow-100 text-yellow-900'
        if (percentage >= 75) return 'bg-blue-100 text-blue-900'
        return 'bg-green-100 text-green-900'
    }

    // Helper to get progress bar color
    function getProgressColor(percentage: number): string {
        if (percentage >= 100) return 'bg-red-500'
        if (percentage >= 90) return 'bg-yellow-500'
        if (percentage >= 75) return 'bg-blue-500'
        return 'bg-green-500'
    }

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto rounded-lg border">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="min-w-[200px]">Descrição</TableHead>
                            <TableHead className="text-right">Unit.</TableHead>
                            <TableHead className="text-right">V. Unit.</TableHead>
                            <TableHead className="text-right">Contratado</TableHead>
                            <TableHead className="text-right">Anterior</TableHead>
                            <TableHead className="text-right">Atual</TableHead>
                            <TableHead className="text-right">Acumulado</TableHead>
                            <TableHead className="text-right w-40">Progresso</TableHead>
                            <TableHead className="text-right">Saldo</TableHead>
                            <TableHead className="text-right">V. Atual</TableHead>
                            <TableHead className="text-right">V. Acumulado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item) => (
                            <TableRow key={item.id} className="hover:bg-muted/50">
                                {/* Description */}
                                <TableCell className="min-w-[200px]">
                                    <div className="flex flex-col gap-1">
                                        <span className="font-medium text-sm">
                                            {item.itemCode || item.description}
                                        </span>
                                        {item.itemCode && (
                                            <span className="text-xs text-muted-foreground">
                                                {item.description}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>

                                {/* Unit */}
                                <TableCell className="text-right text-sm">
                                    {item.unit}
                                </TableCell>

                                {/* Unit Price */}
                                <TableCell className="text-right text-sm font-medium">
                                    {new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL',
                                    }).format(item.unitPrice)}
                                </TableCell>

                                {/* Contracted Quantity */}
                                <TableCell className="text-right text-sm font-semibold">
                                    {item.contractedQuantity.toFixed(2)}
                                </TableCell>

                                {/* Previous Measured */}
                                <TableCell className="text-right text-sm text-muted-foreground">
                                    {item.previousMeasured.toFixed(2)}
                                </TableCell>

                                {/* Current Measured */}
                                <TableCell className="text-right text-sm font-medium">
                                    {item.currentMeasured.toFixed(2)}
                                </TableCell>

                                {/* Accumulated Measured */}
                                <TableCell className="text-right text-sm font-semibold">
                                    {item.accumulatedMeasured.toFixed(2)}
                                </TableCell>

                                {/* Progress Bar with Percentage */}
                                <TableCell className="text-right w-40">
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="w-full">
                                            <Progress
                                                value={Math.min(item.percentageExecuted, 100)}
                                                className="h-2"
                                            />
                                        </div>
                                        <div
                                            className={cn(
                                                'px-2 py-1 rounded text-xs font-semibold',
                                                getPercentageColor(item.percentageExecuted)
                                            )}
                                        >
                                            {item.percentageExecuted.toFixed(1)}%
                                            {item.percentageExecuted >= 90 && (
                                                <AlertTriangle className="inline ml-1 h-3 w-3" />
                                            )}
                                        </div>
                                    </div>
                                </TableCell>

                                {/* Balance */}
                                <TableCell className="text-right text-sm">
                                    <span className={item.balanceQuantity <= 0 ? 'text-red-600 font-semibold' : ''}>
                                        {item.balanceQuantity.toFixed(2)}
                                    </span>
                                </TableCell>

                                {/* Current Value */}
                                <TableCell className="text-right text-sm font-medium">
                                    {new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL',
                                    }).format(item.currentValue)}
                                </TableCell>

                                {/* Accumulated Value */}
                                <TableCell className="text-right text-sm font-semibold text-green-700">
                                    {new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL',
                                    }).format(item.accumulatedValue)}
                                </TableCell>
                            </TableRow>
                        ))}

                        {/* Totals Row */}
                        <TableRow className="font-semibold bg-muted/80 hover:bg-muted">
                            <TableCell colSpan={3}>TOTAIS</TableCell>
                            <TableCell className="text-right">
                                {totals.contractedQuantity.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                                {totals.previousMeasured.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                                {totals.currentMeasured.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                                {totals.accumulatedMeasured.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                                <span className={cn(
                                    'px-2 py-1 rounded text-xs font-semibold',
                                    getPercentageColor(
                                        totals.contractedQuantity > 0
                                            ? (totals.accumulatedMeasured / totals.contractedQuantity) * 100
                                            : 0
                                    )
                                )}>
                                    {totals.contractedQuantity > 0
                                        ? ((totals.accumulatedMeasured / totals.contractedQuantity) * 100).toFixed(1)
                                        : '0.0'}%
                                </span>
                            </TableCell>
                            <TableCell className="text-right">
                                {totals.balanceQuantity.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                                {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                }).format(totals.currentValue)}
                            </TableCell>
                            <TableCell className="text-right text-green-700">
                                {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                }).format(totals.accumulatedValue)}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            {/* Warning messages */}
            <div className="space-y-2">
                {items.some(item => item.percentageExecuted >= 100) && (
                    <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">
                            {items.filter(i => i.percentageExecuted >= 100).length} item(ns) excedeu(am) a quantidade contratada.
                        </p>
                    </div>
                )}
                {items.some(item => item.percentageExecuted >= 90 && item.percentageExecuted < 100) && (
                    <div className="flex gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">
                            {items.filter(i => i.percentageExecuted >= 90 && i.percentageExecuted < 100).length} item(ns) próximo(s) ao limite contratado.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
