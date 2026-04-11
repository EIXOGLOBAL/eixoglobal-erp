'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { upsertSystemSetting, removeSystemSetting, testAnthropicKey } from '@/app/actions/system-settings-actions'
import { CheckCircle2, XCircle, Loader2, Trash2, Eye, EyeOff, FlaskConical, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Props = {
  currentMaskedKey: string | null
  isConfigured: boolean
}

export function ApiKeyManager({ currentMaskedKey, isConfigured }: Props) {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  async function handleSave() {
    if (!apiKey.trim()) return
    setLoading(true)
    setMessage(null)
    try {
      const result = await upsertSystemSetting('ANTHROPIC_API_KEY', apiKey.trim(), 'Chave API Anthropic')
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: 'Chave salva com sucesso!' })
        setApiKey('')
        router.refresh()
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    }
    setLoading(false)
  }

  async function handleTest() {
    const keyToTest = apiKey.trim()
    if (!keyToTest) {
      setMessage({ type: 'error', text: 'Digite a chave para testar' })
      return
    }
    setTesting(true)
    setMessage(null)
    try {
      const result = await testAnthropicKey(keyToTest)
      if (result.success) {
        setMessage({ type: 'success', text: `Chave valida! Modelo: ${result.model}` })
      } else {
        setMessage({ type: 'error', text: `Chave invalida: ${result.error}` })
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    }
    setTesting(false)
  }

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja remover a chave API? Os recursos de IA ficarao indisponiveis.')) return
    setLoading(true)
    setMessage(null)
    try {
      const result = await removeSystemSetting('ANTHROPIC_API_KEY')
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: 'Chave removida.' })
        router.refresh()
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      {/* Status atual */}
      <div className="flex items-center gap-3">
        {isConfigured ? (
          <>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">API configurada</span>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {currentMaskedKey}
            </Badge>
          </>
        ) : (
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            <span className="font-medium">API nao configurada</span>
          </div>
        )}
      </div>

      {/* Input para nova chave */}
      <div className="space-y-2">
        <Label htmlFor="api-key">
          {isConfigured ? 'Atualizar chave API' : 'Inserir chave API Anthropic'}
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="api-key"
              type={showKey ? 'text' : 'password'}
              placeholder="sk-ant-api03-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="pr-10 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Botoes */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={handleTest} variant="outline" size="sm" disabled={testing || !apiKey.trim()}>
          {testing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-1" />}
          Testar
        </Button>
        <Button onClick={handleSave} size="sm" disabled={loading || !apiKey.trim()}>
          {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          Salvar
        </Button>
        {isConfigured && (
          <Button onClick={handleDelete} variant="destructive" size="sm" disabled={loading}>
            <Trash2 className="h-4 w-4 mr-1" />
            Remover
          </Button>
        )}
      </div>

      {/* Mensagem de feedback */}
      {message && (
        <div className={`text-sm p-2 rounded ${message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-950/30' : 'bg-red-50 text-red-700 dark:bg-red-950/30'}`}>
          {message.text}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Obtenha sua chave em console.anthropic.com. A chave e armazenada no banco de dados e tem prioridade sobre a variavel de ambiente.
      </p>
    </div>
  )
}
