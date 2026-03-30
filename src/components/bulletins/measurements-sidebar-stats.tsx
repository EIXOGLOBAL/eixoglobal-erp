'use client'

import { Card } from "@/components/ui/card"
import { Clock, AlertCircle, CheckCircle2 } from "lucide-react"
import Link from "next/link"

interface MeasurementsSidebarStatsProps {
    pendingCount?: number
    draftCount?: number
    approvedCount?: number
}

export function MeasurementsSidebarStats({
    pendingCount = 0,
    draftCount = 0,
    approvedCount = 0,
}: MeasurementsSidebarStatsProps) {
    const hasAlerts = pendingCount > 0 || draftCount > 0

    return (
        <Link href="/measurements" className="block group">
            <Card className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-300 transition-colors cursor-pointer">
                <h4 className="text-xs font-semibold text-foreground mb-2 group-hover:text-blue-700">
                    Medições
                </h4>

                <div className="space-y-2 text-xs">
                    {pendingCount > 0 && (
                        <div className="flex items-center gap-2 text-orange-700">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span>{pendingCount} pendente{pendingCount !== 1 ? 's' : ''}</span>
                        </div>
                    )}

                    {draftCount > 0 && (
                        <div className="flex items-center gap-2 text-slate-700">
                            <AlertCircle className="h-3 w-3 flex-shrink-0" />
                            <span>{draftCount} rascunho{draftCount !== 1 ? 's' : ''}</span>
                        </div>
                    )}

                    {approvedCount > 0 && (
                        <div className="flex items-center gap-2 text-green-700">
                            <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                            <span>{approvedCount} aprovado{approvedCount !== 1 ? 's' : ''}</span>
                        </div>
                    )}

                    {!hasAlerts && (
                        <p className="text-muted-foreground italic">
                            Nenhuma medição pendente
                        </p>
                    )}
                </div>
            </Card>
        </Link>
    )
}
