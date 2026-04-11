'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar, X } from 'lucide-react'

export interface DateRange {
  from: string
  to: string
}

interface DateRangeFilterProps {
  value: DateRange
  onChange: (range: DateRange) => void
  className?: string
}

function getPresetRange(preset: string): DateRange {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()

  const toISO = (date: Date) => date.toISOString().split('T')[0]

  switch (preset) {
    case 'today': {
      const today = toISO(now)
      return { from: today, to: today }
    }
    case 'this-week': {
      const dayOfWeek = now.getDay()
      const monday = new Date(y, m, d - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return { from: toISO(monday), to: toISO(sunday) }
    }
    case 'this-month': {
      const first = new Date(y, m, 1)
      const last = new Date(y, m + 1, 0)
      return { from: toISO(first), to: toISO(last) }
    }
    case 'last-month': {
      const first = new Date(y, m - 1, 1)
      const last = new Date(y, m, 0)
      return { from: toISO(first), to: toISO(last) }
    }
    case 'this-year': {
      const first = new Date(y, 0, 1)
      const last = new Date(y, 11, 31)
      return { from: toISO(first), to: toISO(last) }
    }
    default:
      return { from: '', to: '' }
  }
}

const PRESETS = [
  { key: 'today', label: 'Hoje' },
  { key: 'this-week', label: 'Esta Semana' },
  { key: 'this-month', label: 'Este Mes' },
  { key: 'last-month', label: 'Ultimo Mes' },
  { key: 'this-year', label: 'Este Ano' },
]

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const hasValue = value.from || value.to

  return (
    <div className={`flex flex-wrap items-end gap-2 ${className ?? ''}`}>
      <div className="flex items-center gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">De</label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="date"
              value={value.from}
              onChange={(e) => onChange({ ...value, from: e.target.value })}
              className="pl-8 h-9 w-[155px] text-sm"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Ate</label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="date"
              value={value.to}
              onChange={(e) => onChange({ ...value, to: e.target.value })}
              className="pl-8 h-9 w-[155px] text-sm"
            />
          </div>
        </div>
        {hasValue && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2 mt-5"
            onClick={() => onChange({ from: '', to: '' })}
            title="Limpar periodo"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((preset) => (
          <Button
            key={preset.key}
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onChange(getPresetRange(preset.key))}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
