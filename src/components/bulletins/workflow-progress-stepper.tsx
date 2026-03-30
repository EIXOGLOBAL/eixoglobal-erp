'use client'

import { Card } from "@/components/ui/card"
import { CheckCircle2, Clock, FileText, Eye } from "lucide-react"
import { cn } from "@/lib/utils"

interface WorkflowProgressStepperProps {
    status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'BILLED' | 'REJECTED'
}

export function WorkflowProgressStepper({ status }: WorkflowProgressStepperProps) {
    const steps = [
        { key: 'DRAFT', label: 'Rascunho', icon: FileText },
        { key: 'PENDING_APPROVAL', label: 'Enviado', icon: Clock },
        { key: 'APPROVED', label: 'Aprovado', icon: CheckCircle2 },
        { key: 'BILLED', label: 'Faturado', icon: Eye },
    ]

    // Map status to step index
    const statusToIndex: Record<string, number> = {
        'DRAFT': 0,
        'PENDING_APPROVAL': 1,
        'APPROVED': 2,
        'BILLED': 3,
        'REJECTED': 1, // Rejected goes back to pending
    }

    const currentIndex = statusToIndex[status] ?? 0
    const isRejected = status === 'REJECTED'

    return (
        <Card className="overflow-hidden bg-gradient-to-r from-slate-50 to-slate-100">
            <div className="p-6">
                <div className="flex items-center justify-between gap-2">
                    {steps.map((step, index) => {
                        const Icon = step.icon
                        const isCompleted = index < currentIndex
                        const isCurrent = index === currentIndex
                        const isDisabled = index > currentIndex
                        const isRejectedStep = isRejected && index === 1

                        return (
                            <div key={step.key} className="flex flex-col items-center flex-1">
                                {/* Circle with icon */}
                                <div
                                    className={cn(
                                        'flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 mb-2',
                                        isCompleted && 'bg-green-100 border-green-500 text-green-700',
                                        isCurrent && !isRejected && 'bg-blue-100 border-blue-500 text-blue-700 ring-2 ring-blue-300 ring-offset-2',
                                        isRejectedStep && 'bg-red-100 border-red-500 text-red-700 ring-2 ring-red-300 ring-offset-2',
                                        isDisabled && !isRejectedStep && 'bg-gray-100 border-gray-300 text-gray-400',
                                    )}
                                >
                                    <Icon className="h-5 w-5" />
                                </div>

                                {/* Label */}
                                <span
                                    className={cn(
                                        'text-xs font-medium text-center',
                                        (isCompleted || isCurrent) && 'text-foreground',
                                        isDisabled && !isRejectedStep && 'text-muted-foreground',
                                        isRejectedStep && 'text-red-700 font-semibold',
                                    )}
                                >
                                    {step.label}
                                </span>

                                {/* Connecting line */}
                                {index < steps.length - 1 && (
                                    <div
                                        className={cn(
                                            'absolute h-1 bg-gray-300 transition-all duration-300',
                                            'top-[44px] left-[calc(50%+28px)] w-[calc(25%-4px)]',
                                            index < currentIndex && 'bg-green-500',
                                            index === currentIndex && !isRejected && 'bg-blue-500',
                                            isRejectedStep && 'bg-red-500',
                                        )}
                                    />
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Status message */}
                <div className="mt-6 pt-4 border-t text-center">
                    {isRejected ? (
                        <p className="text-sm text-red-700 font-medium">
                            Status: Rejeitado - Aguardando revisão e reenviamento
                        </p>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            {currentIndex === 0 && 'Em edição - Edite e envie para aprovação'}
                            {currentIndex === 1 && 'Aguardando análise do responsável'}
                            {currentIndex === 2 && 'Pronto para faturamento'}
                            {currentIndex === 3 && 'Faturado e concluído'}
                        </p>
                    )}
                </div>
            </div>
        </Card>
    )
}
