'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

function formatCPF(digits: string): string {
  const d = digits.slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function validateCPF(digits: string): boolean {
  if (digits.length !== 11) return false
  // Rejeita sequências com todos dígitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(digits)) return false

  // Primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]!) * (10 - i)
  }
  let remainder = sum % 11
  const digit1 = remainder < 2 ? 0 : 11 - remainder

  if (parseInt(digits[9]!) !== digit1) return false

  // Segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i]!) * (11 - i)
  }
  remainder = sum % 11
  const digit2 = remainder < 2 ? 0 : 11 - remainder

  return parseInt(digits[10]!) === digit2
}

interface CpfInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function CpfInput({ value, onChange, placeholder, className, disabled }: CpfInputProps) {
  const [touched, setTouched] = useState(false)

  const digits = value.replace(/\D/g, '')
  const isComplete = digits.length === 11
  const isValid = isComplete && validateCPF(digits)
  const showFeedback = isComplete && touched

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    onChange(formatCPF(raw))
    if (raw.length === 11) setTouched(true)
  }

  function handleBlur() {
    if (digits.length > 0) setTouched(true)
  }

  return (
    <div className="space-y-1">
      <div className="relative">
        <Input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder ?? '000.000.000-00'}
          className={cn(
            'font-mono pr-8',
            showFeedback && isValid && 'border-green-500 focus-visible:ring-green-500',
            showFeedback && !isValid && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          disabled={disabled}
          maxLength={14}
        />
        {showFeedback && (
          <span
            className={cn(
              'absolute right-2.5 top-1/2 -translate-y-1/2 text-sm font-bold select-none',
              isValid ? 'text-green-500' : 'text-destructive'
            )}
            aria-label={isValid ? 'CPF válido' : 'CPF inválido'}
          >
            {isValid ? '✓' : '✗'}
          </span>
        )}
      </div>
      {showFeedback && !isValid && (
        <p className="text-xs text-destructive">CPF inválido</p>
      )}
    </div>
  )
}
