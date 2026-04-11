'use client'

import { useEffect, useState } from 'react'
import { X, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface BulkAction {
  label: string
  icon?: LucideIcon
  onClick: (selectedIds: string[]) => void
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  destructive?: boolean
}

interface BulkActionToolbarProps {
  selectedIds: string[]
  onClearSelection: () => void
  actions: BulkAction[]
}

export function BulkActionToolbar({
  selectedIds,
  onClearSelection,
  actions,
}: BulkActionToolbarProps) {
  const [visible, setVisible] = useState(false)
  const hasSelection = selectedIds.length > 0

  useEffect(() => {
    if (hasSelection) {
      // Pequeno delay para garantir a animação de entrada
      const timer = setTimeout(() => setVisible(true), 10)
      return () => clearTimeout(timer)
    } else {
      setVisible(false)
    }
  }, [hasSelection])

  if (!hasSelection) return null

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 z-50 -translate-x-1/2',
        'flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg',
        'transition-all duration-300 ease-out',
        visible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-4 opacity-0'
      )}
    >
      <div className="flex items-center gap-2">
        <Badge variant="secondary">
          {selectedIds.length}
        </Badge>
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          {selectedIds.length === 1 ? 'item selecionado' : 'itens selecionados'}
        </span>
      </div>

      <div className="mx-1 h-6 w-px bg-border" />

      <div className="flex items-center gap-2">
        {actions.map((action) => {
          const Icon = action.icon
          const variant = action.destructive
            ? 'destructive'
            : action.variant ?? 'outline'

          return (
            <Button
              key={action.label}
              variant={variant}
              size="sm"
              onClick={() => action.onClick(selectedIds)}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {action.label}
            </Button>
          )
        })}
      </div>

      <div className="mx-1 h-6 w-px bg-border" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="text-muted-foreground"
      >
        <X className="h-4 w-4" />
        Limpar seleção
      </Button>
    </div>
  )
}
