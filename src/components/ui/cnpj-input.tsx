'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface CnpjData {
  razaoSocial: string
  nomeFantasia: string
  email: string
  phone: string
  address: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
  cnae: string
  situacao: string
}

interface CnpjInputProps {
  value: string
  onChange: (value: string) => void
  onDataFill: (data: CnpjData) => void
  disabled?: boolean
}

export function CnpjInput({ value, onChange, onDataFill, disabled }: CnpjInputProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [situacao, setSituacao] = useState('')

  function formatCnpj(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 14)
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }

  async function handleSearch() {
    const cnpj = value.replace(/\D/g, '')
    if (cnpj.length !== 14) {
      setError('CNPJ deve ter 14 dígitos')
      return
    }
    setLoading(true)
    setError('')
    setSituacao('')
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
      if (!res.ok) {
        setError('CNPJ não encontrado na Receita Federal')
        return
      }
      const data = await res.json()

      const situacaoStr = data.descricao_situacao_cadastral || ''
      setSituacao(situacaoStr)

      const addressStr = [data.logradouro, data.numero, data.complemento]
        .filter(Boolean).join(', ')

      onDataFill({
        razaoSocial: data.razao_social || '',
        nomeFantasia: data.nome_fantasia || '',
        email: data.email || '',
        phone: data.ddd_telefone_1
          ? `(${data.ddd_telefone_1}) ${data.telefone_1 || ''}`.trim()
          : '',
        address: addressStr,
        neighborhood: data.bairro || '',
        city: data.municipio || '',
        state: data.uf || '',
        zipCode: data.cep ? data.cep.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2') : '',
        cnae: data.cnae_fiscal_descricao || '',
        situacao: situacaoStr,
      })
    } catch {
      setError('Erro ao consultar Receita Federal')
    } finally {
      setLoading(false)
    }
  }

  const isAtiva = situacao.toLowerCase().includes('ativa')
  const isBaixa = situacao.toLowerCase().includes('baixada') || situacao.toLowerCase().includes('inapta')

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={e => onChange(formatCnpj(e.target.value))}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch() } }}
          placeholder="00.000.000/0001-00"
          maxLength={18}
          disabled={disabled}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleSearch}
          disabled={disabled || loading || value.replace(/\D/g, '').length !== 14}
          title="Consultar Receita Federal"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>
      {situacao && (
        <Badge variant={isAtiva ? 'default' : isBaixa ? 'destructive' : 'secondary'} className="text-xs">
          Receita Federal: {situacao}
        </Badge>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
