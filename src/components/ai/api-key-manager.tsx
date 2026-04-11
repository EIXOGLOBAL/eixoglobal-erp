'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  upsertSystemSetting,
  removeSystemSetting,
  testAnthropicKey,
  testOpenRouterKey,
  setAIProvider,
} from '@/app/actions/system-settings-actions'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Eye,
  EyeOff,
  FlaskConical,
  Save,
  Globe,
  Cpu,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

type Provider = 'anthropic' | 'openrouter'

type Props = {
  anthropicMaskedKey: string | null
  anthropicConfigured: boolean
  openrouterMaskedKey: string | null
  openrouterConfigured: boolean
  activeProvider: Provider | null
  openrouterModel: string | null
}

export function ApiKeyManager({
  anthropicMaskedKey,
  anthropicConfigured,
  openrouterMaskedKey,
  openrouterConfigured,
  activeProvider,
  openrouterModel,
}: Props) {
  const [anthropicKey, setAnthropicKey] = useState('')
  const [openrouterKey, setOpenrouterKey] = useState('')
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [showOpenrouterKey, setShowOpenrouterKey] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  async function handleSaveKey(provider: Provider) {
    const key = provider === 'anthropic' ? anthropicKey.trim() : openrouterKey.trim()
    if (!key) return

    const settingKey = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENROUTER_API_KEY'
    const label = provider === 'anthropic' ? 'Chave API Anthropic' : 'Chave API OpenRouter'

    setLoading(`save-${provider}`)
    setMessage(null)
    try {
      const result = await upsertSystemSetting(settingKey, key, label)
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: `Chave ${provider === 'anthropic' ? 'Anthropic' : 'OpenRouter'} salva!` })
        if (provider === 'anthropic') setAnthropicKey('')
        else setOpenrouterKey('')
        router.refresh()
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    }
    setLoading(null)
  }

  async function handleTestKey(provider: Provider) {
    const key = provider === 'anthropic' ? anthropicKey.trim() : openrouterKey.trim()
    if (!key) {
      setMessage({ type: 'error', text: 'Digite a chave para testar' })
      return
    }

    setLoading(`test-${provider}`)
    setMessage(null)
    try {
      const result = provider === 'anthropic'
        ? await testAnthropicKey(key)
        : await testOpenRouterKey(key)

      if (result.success) {
        setMessage({ type: 'success', text: `Chave valida! Modelo: ${result.model}` })
      } else {
        setMessage({ type: 'error', text: `Chave invalida: ${result.error}` })
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    }
    setLoading(null)
  }

  async function handleDeleteKey(provider: Provider) {
    const name = provider === 'anthropic' ? 'Anthropic' : 'OpenRouter'
    if (!confirm(`Tem certeza que deseja remover a chave ${name}?`)) return

    const settingKey = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENROUTER_API_KEY'
    setLoading(`delete-${provider}`)
    setMessage(null)
    try {
      const result = await removeSystemSetting(settingKey)
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: `Chave ${name} removida.` })
        router.refresh()
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    }
    setLoading(null)
  }

  async function handleSetProvider(provider: Provider) {
    setLoading(`provider-${provider}`)
    setMessage(null)
    try {
      const result = await setAIProvider(provider)
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: `Provedor ativo: ${provider === 'anthropic' ? 'Anthropic' : 'OpenRouter'}` })
        router.refresh()
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    }
    setLoading(null)
  }

  async function handleSaveModel() {
    setLoading('save-model')
    setMessage(null)
    try {
      const modelInput = (document.getElementById('openrouter-model') as HTMLInputElement)?.value?.trim()
      if (!modelInput) {
        setMessage({ type: 'error', text: 'Informe o modelo' })
        setLoading(null)
        return
      }
      const result = await upsertSystemSetting('OPENROUTER_MODEL', modelInput, 'Modelo OpenRouter')
      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else {
        setMessage({ type: 'success', text: `Modelo atualizado: ${modelInput}` })
        router.refresh()
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    }
    setLoading(null)
  }

  const isAnyLoading = loading !== null

  return (
    <div className="space-y-6">
      {/* Selecao de provider ativo */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Provedor de IA Ativo</Label>
        <div className="flex gap-2">
          <Button
            onClick={() => handleSetProvider('anthropic')}
            variant={activeProvider === 'anthropic' ? 'default' : 'outline'}
            size="sm"
            disabled={isAnyLoading || !anthropicConfigured}
            className="flex items-center gap-2"
          >
            <Cpu className="h-4 w-4" />
            Anthropic Claude
            {activeProvider === 'anthropic' && <Badge variant="secondary" className="ml-1 text-xs">Ativo</Badge>}
          </Button>
          <Button
            onClick={() => handleSetProvider('openrouter')}
            variant={activeProvider === 'openrouter' ? 'default' : 'outline'}
            size="sm"
            disabled={isAnyLoading || !openrouterConfigured}
            className="flex items-center gap-2"
          >
            <Globe className="h-4 w-4" />
            OpenRouter
            {activeProvider === 'openrouter' && <Badge variant="secondary" className="ml-1 text-xs">Ativo</Badge>}
          </Button>
        </div>
        {!anthropicConfigured && !openrouterConfigured && (
          <p className="text-xs text-orange-600 mt-1">Configure pelo menos uma chave API abaixo.</p>
        )}
      </div>

      {/* Anthropic Key */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-purple-600" />
            <span className="font-medium text-sm">Anthropic Claude</span>
          </div>
          {anthropicConfigured ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <Badge variant="outline" className="font-mono text-xs">{anthropicMaskedKey}</Badge>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-600">
              <XCircle className="h-4 w-4" />
              <span className="text-xs">Nao configurada</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showAnthropicKey ? 'text' : 'password'}
              placeholder="sk-ant-api03-..."
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              className="pr-10 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowAnthropicKey(!showAnthropicKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showAnthropicKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => handleTestKey('anthropic')} variant="outline" size="sm" disabled={isAnyLoading || !anthropicKey.trim()}>
            {loading === 'test-anthropic' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-1" />}
            Testar
          </Button>
          <Button onClick={() => handleSaveKey('anthropic')} size="sm" disabled={isAnyLoading || !anthropicKey.trim()}>
            {loading === 'save-anthropic' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Salvar
          </Button>
          {anthropicConfigured && (
            <Button onClick={() => handleDeleteKey('anthropic')} variant="destructive" size="sm" disabled={isAnyLoading}>
              <Trash2 className="h-4 w-4 mr-1" />
              Remover
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Obtenha em <a href="https://console.anthropic.com" target="_blank" rel="noopener" className="underline">console.anthropic.com</a>. Requer creditos pagos.
        </p>
      </div>

      {/* OpenRouter Key */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm">OpenRouter</span>
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">Modelos gratuitos</Badge>
          </div>
          {openrouterConfigured ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <Badge variant="outline" className="font-mono text-xs">{openrouterMaskedKey}</Badge>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-600">
              <XCircle className="h-4 w-4" />
              <span className="text-xs">Nao configurada</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showOpenrouterKey ? 'text' : 'password'}
              placeholder="sk-or-v1-..."
              value={openrouterKey}
              onChange={(e) => setOpenrouterKey(e.target.value)}
              className="pr-10 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowOpenrouterKey(!showOpenrouterKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showOpenrouterKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => handleTestKey('openrouter')} variant="outline" size="sm" disabled={isAnyLoading || !openrouterKey.trim()}>
            {loading === 'test-openrouter' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-1" />}
            Testar
          </Button>
          <Button onClick={() => handleSaveKey('openrouter')} size="sm" disabled={isAnyLoading || !openrouterKey.trim()}>
            {loading === 'save-openrouter' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Salvar
          </Button>
          {openrouterConfigured && (
            <Button onClick={() => handleDeleteKey('openrouter')} variant="destructive" size="sm" disabled={isAnyLoading}>
              <Trash2 className="h-4 w-4 mr-1" />
              Remover
            </Button>
          )}
        </div>

        {/* Modelo OpenRouter */}
        {openrouterConfigured && (
          <div className="pt-2 border-t space-y-2">
            <Label htmlFor="openrouter-model" className="text-xs">Modelo OpenRouter</Label>
            <div className="flex gap-2">
              <Input
                id="openrouter-model"
                defaultValue={openrouterModel || 'google/gemini-2.0-flash-exp:free'}
                placeholder="google/gemini-2.0-flash-exp:free"
                className="font-mono text-xs"
              />
              <Button onClick={handleSaveModel} variant="outline" size="sm" disabled={isAnyLoading}>
                {loading === 'save-model' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Modelos gratuitos: google/gemini-2.0-flash-exp:free, deepseek/deepseek-chat-v3-0324:free, meta-llama/llama-3.3-70b-instruct:free
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Obtenha em <a href="https://openrouter.ai/keys" target="_blank" rel="noopener" className="underline">openrouter.ai/keys</a>. Suporta modelos gratuitos.
        </p>
      </div>

      {/* Mensagem de feedback */}
      {message && (
        <div className={`text-sm p-2 rounded ${message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-950/30' : 'bg-red-50 text-red-700 dark:bg-red-950/30'}`}>
          {message.text}
        </div>
      )}
    </div>
  )
}
