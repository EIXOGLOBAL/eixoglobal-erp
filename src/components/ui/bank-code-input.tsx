'use client'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

interface BankCodeInputProps {
  value: string
  onChange: (value: string) => void
  onBankNameFound?: (name: string) => void
  disabled?: boolean
}

export function BankCodeInput({ value, onChange, onBankNameFound, disabled }: BankCodeInputProps) {
  const [bankName, setBankName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const code = value.replace(/\D/g, '')
    if (code.length >= 3) {
      lookupBank(code)
    } else {
      setBankName('')
    }
  }, [value])

  async function lookupBank(code: string) {
    setLoading(true)
    try {
      const res = await fetch('https://brasilapi.com.br/api/banks/v1')
      const banks: Array<{ code: number; fullName: string; name: string }> = await res.json()
      const found = banks.find(b => b.code === parseInt(code))
      if (found) {
        setBankName(found.fullName || found.name)
        onBankNameFound?.(found.fullName || found.name)
      } else {
        setBankName('')
      }
    } catch {
      setBankName('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-1">
      <div className="relative">
        <Input
          value={value}
          onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="Ex: 341"
          maxLength={4}
          disabled={disabled}
        />
        {loading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {bankName && (
        <Badge variant="secondary" className="text-xs font-normal">
          🏦 {bankName}
        </Badge>
      )}
    </div>
  )
}
