'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card } from "@/components/ui/card"
import { X, CheckCircle2, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface BulkActionsBarProps {
    selectedCount: number
    onSelectAll?: (checked: boolean) => void
    onClearSelection: () => void
    onApprove?: () => Promise<void>
    onReject?: () => Promise<void>
    canApprove?: boolean
    canReject?: boolean
}

export function BulkActionsBar({
    selectedCount,
    onSelectAll,
    onClearSelection,
    onApprove,
    onReject,
    canApprove = true,
    canReject = true,
}: BulkActionsBarProps) {
    const [isProcessing, setIsProcessing] = useState(false)
    const { toast } = useToast()

    if (selectedCount === 0) return null

    const handleApprove = async () => {
        if (!onApprove) return
        setIsProcessing(true)
        try {
            await onApprove()
            toast({
                title: "Sucesso",
                description: `${selectedCount} boletim(ns) aprovado(s)`,
            })
            onClearSelection()
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Falha ao aprovar boletins",
            })
        } finally {
            setIsProcessing(false)
        }
    }

    const handleReject = async () => {
        if (!onReject) return
        setIsProcessing(true)
        try {
            await onReject()
            toast({
                title: "Sucesso",
                description: `${selectedCount} boletim(ns) rejeitado(s)`,
            })
            onClearSelection()
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro",
                description: "Falha ao rejeitar boletins",
            })
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <Card className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white border-slate-800 shadow-2xl z-40">
            <div className="px-6 py-4 flex items-center gap-4">
                {/* Selection Info */}
                <div className="flex items-center gap-3">
                    <Checkbox
                        checked={selectedCount > 0}
                        disabled
                        className="border-white/30"
                    />
                    <span className="font-medium text-sm">
                        {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 ml-4 border-l border-white/20 pl-4">
                    {canApprove && onApprove && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleApprove}
                            disabled={isProcessing}
                            className="text-white hover:bg-green-600/20 hover:text-green-300"
                        >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Aprovar
                        </Button>
                    )}

                    {canReject && onReject && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleReject}
                            disabled={isProcessing}
                            className="text-white hover:bg-red-600/20 hover:text-red-300"
                        >
                            <XCircle className="h-4 w-4 mr-2" />
                            Rejeitar
                        </Button>
                    )}
                </div>

                {/* Close Button */}
                <div className="ml-4 border-l border-white/20 pl-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClearSelection}
                        className="text-white/70 hover:text-white"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </Card>
    )
}
