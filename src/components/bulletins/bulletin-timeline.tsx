'use client'

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Clock,
    Send,
    CheckCircle2,
    XCircle,
    AlertCircle,
    FileText,
    DollarSign,
} from "lucide-react"

interface TimelineEvent {
    status: string
    timestamp: Date | null
    description: string
    icon: React.ReactNode
    color: string
}

interface BulletinTimelineProps {
    createdAt: Date
    submittedAt?: Date | null
    approvedByEngineerAt?: Date | null
    rejectedAt?: Date | null
    billedAt?: Date | null
    currentStatus: string
    rejectionReason?: string | null
}

export function BulletinTimeline({
    createdAt,
    submittedAt,
    approvedByEngineerAt,
    rejectedAt,
    billedAt,
    currentStatus,
    rejectionReason,
}: BulletinTimelineProps) {
    const formatDateTime = (date: Date) => {
        return new Date(date).toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const events: TimelineEvent[] = [
        {
            status: 'CREATED',
            timestamp: createdAt,
            description: 'Boletim criado',
            icon: <FileText className="h-4 w-4" />,
            color: 'bg-blue-100 text-blue-700 border-blue-300',
        },
        ...(submittedAt
            ? [{
                status: 'SUBMITTED',
                timestamp: submittedAt,
                description: 'Enviado para aprovação',
                icon: <Send className="h-4 w-4" />,
                color: 'bg-purple-100 text-purple-700 border-purple-300',
            }]
            : []),
        ...(approvedByEngineerAt
            ? [{
                status: 'APPROVED',
                timestamp: approvedByEngineerAt,
                description: 'Aprovado pela engenharia',
                icon: <CheckCircle2 className="h-4 w-4" />,
                color: 'bg-green-100 text-green-700 border-green-300',
            }]
            : []),
        ...(rejectedAt
            ? [{
                status: 'REJECTED',
                timestamp: rejectedAt,
                description: `Rejeitado${rejectionReason ? ': ' + rejectionReason.substring(0, 30) : ''}`,
                icon: <XCircle className="h-4 w-4" />,
                color: 'bg-red-100 text-red-700 border-red-300',
            }]
            : []),
        ...(billedAt
            ? [{
                status: 'BILLED',
                timestamp: billedAt,
                description: 'Faturado',
                icon: <DollarSign className="h-4 w-4" />,
                color: 'bg-emerald-100 text-emerald-700 border-emerald-300',
            }]
            : []),
    ]

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Histórico de Status</CardTitle>
                <CardDescription>Linha do tempo das mudanças de status</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {events.map((event, index) => (
                        <div key={event.status} className="flex gap-4">
                            {/* Timeline Line */}
                            <div className="flex flex-col items-center">
                                {/* Icon Circle */}
                                <div
                                    className={`rounded-full p-2 border-2 ${event.color} flex items-center justify-center`}
                                >
                                    {event.icon}
                                </div>
                                {/* Line to next event */}
                                {index < events.length - 1 && (
                                    <div className="w-0.5 h-12 bg-gray-200 mt-2" />
                                )}
                            </div>

                            {/* Event Content */}
                            <div className="flex-1 py-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium text-sm">{event.description}</p>
                                    {event.status === currentStatus && (
                                        <Badge variant="secondary" className="text-xs">
                                            Atual
                                        </Badge>
                                    )}
                                </div>
                                {event.timestamp && (
                                    <p className="text-xs text-muted-foreground">
                                        {formatDateTime(event.timestamp)}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
