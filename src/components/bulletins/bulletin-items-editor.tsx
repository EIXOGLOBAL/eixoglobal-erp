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
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { updateBulletinItem } from "@/app/actions/bulletin-actions"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface BulletinItem {
    id: string
    description: string
    unit: string
    unitPrice: number | string
    contractedQuantity: number | string
    previousMeasured: number | string
    currentMeasured: number | string
    accumulatedMeasured: number | string
    balanceQuantity: number | string
    percentageExecuted: number | string
    currentValue: number | string
}

interface BulletinItemsEditorProps {
    items: BulletinItem[]
    bulletinStatus: string
}

export function BulletinItemsEditor({ items, bulletinStatus }: BulletinItemsEditorProps) {
    const { toast } = useToast()
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
    const isEditable = bulletinStatus === 'DRAFT' || bulletinStatus === 'REJECTED'

    async function handleUpdate(itemId: string, newValue: number) {
        if (!isEditable) return

        // Optimistic UI updates could be added here, but for safety lets wait for server
        setLoadingIds(prev => new Set(prev).add(itemId))

        const result = await updateBulletinItem(itemId, newValue)

        if (!result.success) {
            toast({
                variant: "destructive",
                title: "Erro ao atualizar item",
                description: result.error,
            })
        }

        setLoadingIds(prev => {
            const next = new Set(prev)
            next.delete(itemId)
            return next
        })
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="w-[300px]">Descrição do Serviço</TableHead>
                        <TableHead>Unid.</TableHead>
                        <TableHead className="text-right">Qtd. Contrato</TableHead>
                        <TableHead className="text-right">Med. Anterior</TableHead>
                        <TableHead className="text-right w-[120px]">Medição Atual</TableHead>
                        <TableHead className="text-right">Acumulado</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                        <TableHead className="text-right">% Exec.</TableHead>
                        <TableHead className="text-right">Valor Atual</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.description}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                                {Number(item.contractedQuantity).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                                {Number(item.previousMeasured).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right p-2">
                                <div className="relative">
                                    <Input
                                        type="number"
                                        defaultValue={Number(item.currentMeasured)}
                                        disabled={!isEditable || loadingIds.has(item.id)}
                                        className={`text-right h-8 ${isEditable ? 'bg-yellow-50 border-yellow-200 focus:border-yellow-400' : ''}`}
                                        onBlur={(e) => {
                                            const val = parseFloat(e.target.value)
                                            if (!isNaN(val) && val !== Number(item.currentMeasured)) {
                                                handleUpdate(item.id, val)
                                            }
                                        }}
                                        step="0.01"
                                        min="0"
                                    />
                                    {loadingIds.has(item.id) && (
                                        <div className="absolute top-2 right-2">
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                                {Number(item.accumulatedMeasured).toFixed(2)}
                            </TableCell>
                            <TableCell className={`text-right ${Number(item.balanceQuantity) < 0 ? 'text-red-500 font-bold' : ''}`}>
                                {Number(item.balanceQuantity).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                                <Badge variant={Number(item.percentageExecuted) >= 100 ? "secondary" : "outline"}>
                                    {Number(item.percentageExecuted).toFixed(1)}%
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-700">
                                {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                }).format(Number(item.currentValue))}
                            </TableCell>
                        </TableRow>
                    ))}
                    {items.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                Nenhum item encontrado neste boletim.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
