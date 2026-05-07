'use client'

import { Badge } from "@/components/ui/badge"
import { FileText, Clock, CheckCircle2, CheckCheck, Banknote, XCircle, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

type BulletinStatus = 'DRAFT' | 'SUBMITTED' | 'ENGINEER_APPROVED' | 'MANAGER_APPROVED' | 'APPROVED' | 'REJECTED' | string

interface StatusBadgeEnhancedProps {
    status: BulletinStatus
    size?: 'sm' | 'md' | 'lg'
}

export function StatusBadgeEnhanced({ status, size = 'md' }: StatusBadgeEnhancedProps) {
    const configs: Record<string, {
        label: string
        icon: React.ElementType
        className: string
    }> = {
        DRAFT: {
            label: 'Rascunho',
            icon: FileText,
            className: 'bg-slate-50 text-slate-700 border-slate-300',
        },
        SUBMITTED: {
            label: 'Aguard. Aprovação',
            icon: Clock,
            className: 'bg-orange-100 text-orange-800 border-orange-300',
        },
        ENGINEER_APPROVED: {
            label: 'Aprovado Eng.',
            icon: CheckCircle2,
            className: 'bg-blue-100 text-blue-800 border-blue-300',
        },
        MANAGER_APPROVED: {
            label: 'Aprovado Gest.',
            icon: Shield,
            className: 'bg-purple-100 text-purple-800 border-purple-300',
        },
        APPROVED: {
            label: 'Aprovado',
            icon: CheckCheck,
            className: 'bg-green-100 text-green-800 border-green-300',
        },
        REJECTED: {
            label: 'Rejeitado',
            icon: XCircle,
            className: 'bg-red-100 text-red-800 border-red-300',
        },
        // Aliases de compatibilidade
        PENDING_APPROVAL: {
            label: 'Aguard. Aprovação',
            icon: Clock,
            className: 'bg-orange-100 text-orange-800 border-orange-300',
        },
        BILLED: {
            label: 'Faturado',
            icon: Banknote,
            className: 'bg-blue-100 text-blue-800 border-blue-300',
        },
    }

    const config = configs[status] ?? {
        label: status,
        icon: FileText,
        className: 'bg-slate-50 text-slate-700 border-slate-300',
    }

    const Icon = config.icon

    const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
    const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'

    return (
        <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border', config.className, textSize)}>
            <Icon className={iconSize} />
            <span className="font-medium">{config.label}</span>
        </div>
    )
}
