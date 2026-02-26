'use client'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'

interface HolidayDatePickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
  disabled?: boolean
}

export function HolidayDatePicker({ value, onChange, label, disabled }: HolidayDatePickerProps) {
  const [warning, setWarning] = useState<string | null>(null)

  async function checkDate(dateStr: string) {
    const date = new Date(dateStr + 'T12:00:00')
    const day = date.getDay()

    if (day === 0) { setWarning('Este dia e Domingo'); return }
    if (day === 6) { setWarning('Este dia e Sabado'); return }

    const year = date.getFullYear()
    try {
      const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`)
      if (!res.ok) { setWarning(null); return }
      const holidays = await res.json()
      const found = holidays.find((h: { date: string; name: string }) => h.date === dateStr)
      if (found) {
        setWarning(`Feriado: ${found.name}`)
      } else {
        setWarning(null)
      }
    } catch {
      setWarning(null)
    }
  }

  useEffect(() => {
    if (!value) { setWarning(null); return }
    checkDate(value)
  }, [value])

  return (
    <div className="space-y-2">
      {label && <span className="text-sm font-medium">{label}</span>}
      <Input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
      />
      {warning && (
        <Alert variant="default" className="py-2 border-amber-200 bg-amber-50 text-amber-800">
          <AlertTriangle className="h-3 w-3 text-amber-600" />
          <AlertDescription className="text-xs text-amber-700">{warning}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
