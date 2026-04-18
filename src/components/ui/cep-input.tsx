'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Search } from 'lucide-react'

interface CepInputProps {
  value: string
  onChange: (value: string) => void
  onAddressFill: (address: {
    street: string
    neighborhood: string
    city: string
    state: string
  }) => void
  disabled?: boolean
}

export function CepInput({ value, onChange, onAddressFill, disabled }: CepInputProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function formatCep(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    if (digits.length > 5) return digits.slice(0, 5) + '-' + digits.slice(5)
    return digits
  }

  async function handleSearch() {
    const cep = value.replace(/\D/g, '')
    if (cep.length !== 8) {
      setError('CEP deve ter 8 dígitos')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await res.json()
      if (data.erro) {
        setError('CEP não encontrado')
      } else {
        onAddressFill({
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
        })
      }
    } catch {
      setError('Erro ao buscar CEP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={e => onChange(formatCep(e.target.value))}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch() } }}
          placeholder="00000-000"
          maxLength={9}
          disabled={disabled}
          className="flex-1"
        />
        <Button
 type="button"
 variant="outline"
 size="icon" aria-label="Buscar CEP" 
 onClick={handleSearch}
 disabled={disabled || loading || value.replace(/\D/g,'').length !== 8}
>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
