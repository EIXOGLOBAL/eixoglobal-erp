'use client'

import { useUrlFilters } from '@/hooks/use-url-filters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'

interface FilterOption {
  value: string
  label: string
}

export interface FilterConfig {
  key: string
  label: string
  type: 'text' | 'select' | 'date'
  options?: FilterOption[]
  placeholder?: string
}

interface FilterBarProps {
  filters: FilterConfig[]
  className?: string
}

export function FilterBar({ filters, className }: FilterBarProps) {
  const filterKeys = filters.map((f) => f.key)
  const { filters: currentValues, setFilter, clearFilters } = useUrlFilters(filterKeys)

  const hasActiveFilters = filterKeys.some((key) => {
    const value = currentValues[key]
    return value !== null && value !== '' && value !== undefined
  })

  return (
    <div className={`flex flex-wrap items-end gap-3 ${className ?? ''}`}>
      {filters.map((config) => {
        const value = currentValues[config.key]
        const stringValue = value !== null && value !== undefined ? String(value) : ''

        switch (config.type) {
          case 'text':
            return (
              <div key={config.key} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  {config.label}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={config.placeholder ?? `Buscar ${config.label.toLowerCase()}...`}
                    value={stringValue}
                    onChange={(e) => setFilter(config.key, e.target.value || null)}
                    className="pl-10 w-[220px]"
                  />
                </div>
              </div>
            )

          case 'select':
            return (
              <div key={config.key} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  {config.label}
                </label>
                <Select
                  value={stringValue || undefined}
                  onValueChange={(val) => setFilter(config.key, val === '__clear__' ? null : val)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={config.placeholder ?? `Selecionar...`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__clear__">Todos</SelectItem>
                    {config.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )

          case 'date':
            return (
              <div key={config.key} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  {config.label}
                </label>
                <Input
                  type="date"
                  value={stringValue}
                  onChange={(e) => setFilter(config.key, e.target.value || null)}
                  className="w-[180px]"
                />
              </div>
            )

          default:
            return null
        }
      })}

      {hasActiveFilters && (
        <Button
          onClick={clearFilters}
          variant="outline"
          size="sm"
          className="gap-1.5 h-9"
        >
          <X className="h-4 w-4" />
          Limpar Filtros
        </Button>
      )}
    </div>
  )
}
