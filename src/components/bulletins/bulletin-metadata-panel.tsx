'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Users, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import { formatDateTime } from "@/lib/formatters"

interface BulletinMetadataPanelProps {
    referenceMonth: string
    periodStart: Date
    periodEnd: Date
    createdByName: string
    engineerName?: string
    managerName?: string
    submittedAt?: Date | null
    approvedByEngineerAt?: Date | null
    rejectionReason?: string | null
}

export function BulletinMetadataPanel({
    referenceMonth,
    periodStart,
    periodEnd,
    createdByName,
    engineerName,
    managerName,
    submittedAt,
    approvedByEngineerAt,
    rejectionReason,
}: BulletinMetadataPanelProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            {/* Timeline Card */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm">Linha do Tempo</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {submittedAt && (
                        <div className="flex items-start gap-3 pb-2 border-b">
                            <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium">Enviado para Aprovação</p>
                                <p className="text-xs text-muted-foreground">
                                    {formatDateTime(submittedAt)}
                                </p>
                            </div>
                        </div>
                    )}
                    {approvedByEngineerAt && (
                        <div className="flex items-start gap-3 pt-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium">Aprovado</p>
                                <p className="text-xs text-muted-foreground">
                                    {formatDateTime(approvedByEngineerAt)}
                                </p>
                            </div>
                        </div>
                    )}
                    {rejectionReason && (
                        <div className="flex items-start gap-3 pt-2 border-t">
                            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium">Rejeitado</p>
                                <p className="text-xs text-muted-foreground">
                                    {rejectionReason.substring(0, 50)}...
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Responsáveis Card */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-sm">Responsáveis</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Criador:</span>
                        <span className="font-medium">{createdByName}</span>
                    </div>
                    {engineerName && (
                        <div className="flex justify-between text-sm border-t pt-2">
                            <span className="text-muted-foreground">Engenheiro:</span>
                            <span className="font-medium">{engineerName}</span>
                        </div>
                    )}
                    {managerName && (
                        <div className="flex justify-between text-sm border-t pt-2">
                            <span className="text-muted-foreground">Gerente:</span>
                            <span className="font-medium">{managerName}</span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
