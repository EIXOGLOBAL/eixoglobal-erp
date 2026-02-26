'use client'

import { forwardRef, useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface CurrencyInputProps {
  value?: number | null
  onChange?: (value: number) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, placeholder = 'R$ 0,00', className, disabled }, ref) => {
    const [displayValue, setDisplayValue] = useState('')

    const formatBRL = (num: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)

    const parseValue = (str: string): number => {
      const digits = str.replace(/\D/g, '')
      return digits ? parseInt(digits, 10) / 100 : 0
    }

    useEffect(() => {
      if (value != null && value > 0) {
        setDisplayValue(formatBRL(value))
      } else if (value === 0) {
        setDisplayValue('')
      }
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      const num = parseValue(raw)
      setDisplayValue(num > 0 ? formatBRL(num) : '')
      onChange?.(num)
    }

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (!displayValue) setDisplayValue('R$ 0,00')
      e.target.select()
    }

    const handleBlur = () => {
      if (displayValue === 'R$ 0,00') setDisplayValue('')
    }

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={cn('font-mono', className)}
        disabled={disabled}
      />
    )
  }
)
CurrencyInput.displayName = 'CurrencyInput'
