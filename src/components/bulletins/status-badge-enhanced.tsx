'use client'

import { Badge } from "@/components/ui/badge"
import { FileText, Clock, CheckCircle2, Banknote, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatusBadgeEnhancedProps {
    status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'BILLED' | 'REJECTED'
    size?: 'sm' | 'md' | 'lg'
}

export function StatusBadgeEnhanced({ status, size = 'md' }: StatusBadgeEnhancedProps) {
    const configs = {
        DRAFT: {
            label: 'Rascunho',
            icon: FileText,
            variant: 'outline' as const,
            className: 'bg-slate-50 text-slate-700 border-slate-300',
        },
        PENDING_APPROVAL: {
            label: 'Pendente',
            icon: Clock,
            variant: 'default' as const,
            className: 'bg-orange-100 text-orange-800 border-orange-300',
        },
        APPROVED: {
            label: 'Aprovado',
            icon: CheckCircle2,
            variant: 'secondary' as const,
            className: 'bg-green-100 text-green-800 border-green-300',
        },
        BILLED: {
            label: 'Faturado',
            icon: Banknote,
            variant: 'default' as const,
            className: 'bg-blue-100 text-blue-800 border-blue-300',
        },
        REJECTED: {
            label: 'Rejeitado',
            icon: XCircle,
            variant: 'destructive' as const,
            className: 'bg-red-100 text-red-800 border-red-300',
        },
    }

    const config = configs[status]
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
