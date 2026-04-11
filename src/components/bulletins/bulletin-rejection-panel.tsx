'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/formatters"

interface BulletinRejectionPanelProps {
    bulletinId: string
    rejectionReason: string
    rejectedAt: Date | null
}

export function BulletinRejectionPanel({
    bulletinId,
    rejectionReason,
    rejectedAt,
}: BulletinRejectionPanelProps) {
    return (
        <Alert variant="destructive" className="border-red-300 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Boletim Rejeitado</AlertTitle>
            <AlertDescription className="mt-2 space-y-3">
                <div>
                    <p className="text-sm font-medium text-red-900 mb-1">Motivo da Rejeição:</p>
                    <p className="text-sm text-red-800">{rejectionReason}</p>
                </div>
                {rejectedAt && (
                    <p className="text-xs text-red-700">
                        Rejeitado em {formatDate(rejectedAt)} às {new Date(rejectedAt).toLocaleTimeString('pt-BR')}
                    </p>
                )}
                <div className="flex gap-2 pt-2">
                    <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="border-red-300 hover:bg-red-100"
                    >
                        <Link href={`/measurements/${bulletinId}`}>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Revisar e Corrigir
                        </Link>
                    </Button>
                </div>
            </AlertDescription>
        </Alert>
    )
}
