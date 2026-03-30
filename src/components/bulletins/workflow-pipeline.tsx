'use client'

import { Card } from "@/components/ui/card"
import { ArrowRight, CheckCircle2, Clock, FileText, Banknote } from "lucide-react"

interface WorkflowPipelineProps {
    draftCount: number
    pendingCount: number
    approvedCount: number
    billedCount: number
}

export function WorkflowPipeline({
    draftCount,
    pendingCount,
    approvedCount,
    billedCount,
}: WorkflowPipelineProps) {
    const statuses = [
        {
            label: "Rascunho",
            count: draftCount,
            icon: FileText,
            color: "bg-slate-100 text-slate-700",
            borderColor: "border-slate-300",
        },
        {
            label: "Pendente",
            count: pendingCount,
            icon: Clock,
            color: "bg-orange-100 text-orange-700",
            borderColor: "border-orange-300",
        },
        {
            label: "Aprovado",
            count: approvedCount,
            icon: CheckCircle2,
            color: "bg-green-100 text-green-700",
            borderColor: "border-green-300",
        },
        {
            label: "Faturado",
            count: billedCount,
            icon: Banknote,
            color: "bg-blue-100 text-blue-700",
            borderColor: "border-blue-300",
        },
    ]

    return (
        <Card className="overflow-hidden">
            <div className="p-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-6">
                    Pipeline de Fluxo de Trabalho
                </h3>

                <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2">
                    {statuses.map((status, index) => {
                        const Icon = status.icon
                        return (
                            <div key={status.label} className="flex items-center gap-3 min-w-fit">
                                <div className={`flex flex-col items-center p-4 rounded-lg border-2 ${status.borderColor} ${status.color}`}>
                                    <Icon className="h-5 w-5 mb-2" />
                                    <div className="text-2xl font-bold">{status.count}</div>
                                    <div className="text-xs text-center">{status.label}</div>
                                </div>

                                {index < statuses.length - 1 && (
                                    <div className="flex flex-col items-center text-muted-foreground">
                                        <ArrowRight className="h-5 w-5" />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </Card>
    )
}
