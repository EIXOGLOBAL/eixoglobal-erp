'use client'

import { forwardRef } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// Formata CPF: 000.000.000-00
function formatCPF(digits: string): string {
  const d = digits.slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

// Formata CNPJ: 00.000.000/0000-00
function formatCNPJ(digits: string): string {
  const d = digits.slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

interface DocumentInputProps {
  type: 'cpf' | 'cnpj'
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export const DocumentInput = forwardRef<HTMLInputElement, DocumentInputProps>(
  ({ type, value = '', onChange, placeholder, className, disabled }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/\D/g, '')
      const formatted = type === 'cpf' ? formatCPF(digits) : formatCNPJ(digits)
      onChange?.(formatted)
    }

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        placeholder={placeholder ?? (type === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00')}
        className={cn('font-mono', className)}
        disabled={disabled}
        maxLength={type === 'cpf' ? 14 : 18}
      />
    )
  }
)
DocumentInput.displayName = 'DocumentInput'
