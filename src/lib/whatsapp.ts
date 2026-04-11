/**
 * WhatsApp Service — Integration via Evolution API
 *
 * Envia mensagens WhatsApp via Evolution API (REST).
 * Configuracao 100% por env vars; fallback silencioso quando nao configurado.
 *
 * Env vars:
 *   EVOLUTION_API_URL      — URL base da Evolution API (ex: https://evo.seudominio.com.br)
 *   EVOLUTION_API_KEY      — API Key configurada na instancia
 *   EVOLUTION_INSTANCE     — Nome da instancia (ex: "eixo-erp")
 */

// ============================================================================
// TYPES
// ============================================================================

export interface WhatsAppResponse {
  success: boolean
  messageId?: string
  error?: string
}

interface EvolutionTextPayload {
  number: string
  text: string
}

interface EvolutionMediaPayload {
  number: string
  mediatype: 'image' | 'video' | 'document'
  mimetype?: string
  caption?: string
  media: string // URL
}

// ============================================================================
// RATE LIMITER — max 20 msgs/minuto (sliding window)
// ============================================================================

class RateLimiter {
  private timestamps: number[] = []
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  canProceed(): boolean {
    const now = Date.now()
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs)
    return this.timestamps.length < this.maxRequests
  }

  record(): void {
    this.timestamps.push(Date.now())
  }

  get remaining(): number {
    const now = Date.now()
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs)
    return Math.max(0, this.maxRequests - this.timestamps.length)
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Normaliza telefone para formato internacional sem "+" (ex: 5511999999999).
 * Aceita formatos: +55 11 99999-9999, (11) 99999-9999, 11999999999 etc.
 */
function normalizePhone(phone: string): string {
  // Remove tudo que nao e digito
  let digits = phone.replace(/\D/g, '')

  // Se comeca com 0, remove
  if (digits.startsWith('0')) {
    digits = digits.substring(1)
  }

  // Se nao comeca com 55 e tem 10-11 digitos, assume Brasil
  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
    digits = '55' + digits
  }

  return digits
}

/**
 * Sleep helper para backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================================
// WHATSAPP SERVICE
// ============================================================================

class WhatsAppService {
  private readonly apiUrl: string | null
  private readonly apiKey: string | null
  private readonly instance: string | null
  private readonly rateLimiter: RateLimiter
  private readonly maxRetries = 2
  private readonly baseBackoffMs = 1000

  constructor() {
    this.apiUrl = process.env.EVOLUTION_API_URL || null
    this.apiKey = process.env.EVOLUTION_API_KEY || null
    this.instance = process.env.EVOLUTION_INSTANCE || null
    this.rateLimiter = new RateLimiter(20, 60_000) // 20 msgs/minuto
  }

  // --------------------------------------------------------------------------
  // CONFIG CHECK
  // --------------------------------------------------------------------------

  isConfigured(): boolean {
    return !!(this.apiUrl && this.apiKey && this.instance)
  }

  private silentFallback(context: string): WhatsAppResponse {
    console.warn(`[WhatsApp] Servico nao configurado — ${context} ignorado silenciosamente.`)
    return { success: false, error: 'WhatsApp nao configurado. Defina EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE.' }
  }

  // --------------------------------------------------------------------------
  // CORE REQUEST — com retry + backoff
  // --------------------------------------------------------------------------

  private async request<T>(path: string, body: T): Promise<WhatsAppResponse> {
    if (!this.isConfigured()) {
      return this.silentFallback(path)
    }

    if (!this.rateLimiter.canProceed()) {
      return { success: false, error: 'Rate limit atingido (max 20 msgs/min). Tente novamente em instantes.' }
    }

    const url = `${this.apiUrl}/message/${path}/${this.instance}`
    let lastError = ''

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const backoff = this.baseBackoffMs * Math.pow(2, attempt - 1)
          await sleep(backoff)
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'apikey': this.apiKey!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '')
          lastError = `HTTP ${response.status}: ${errorBody || response.statusText}`

          // Nao retenta para erros 4xx (exceto 429 rate limit)
          if (response.status >= 400 && response.status < 500 && response.status !== 429) {
            break
          }
          continue
        }

        const data = await response.json() as { key?: { id?: string }; messageId?: string }
        this.rateLimiter.record()

        return {
          success: true,
          messageId: data.key?.id || data.messageId || undefined,
        }
      } catch (error) {
        lastError = (error as Error).message
      }
    }

    console.error(`[WhatsApp] Falha apos ${this.maxRetries + 1} tentativas: ${lastError}`)
    return { success: false, error: `Falha ao enviar WhatsApp: ${lastError}` }
  }

  // --------------------------------------------------------------------------
  // PUBLIC: Envio de texto
  // --------------------------------------------------------------------------

  async sendWhatsAppMessage(phone: string, message: string): Promise<WhatsAppResponse> {
    if (!phone || !message) {
      return { success: false, error: 'Telefone e mensagem sao obrigatorios.' }
    }

    const normalized = normalizePhone(phone)

    return this.request<EvolutionTextPayload>('sendText', {
      number: normalized,
      text: message,
    })
  }

  // --------------------------------------------------------------------------
  // PUBLIC: Envio de template (monta texto a partir do template)
  // --------------------------------------------------------------------------

  async sendWhatsAppTemplate(
    phone: string,
    templateName: string,
    params: Record<string, string>,
  ): Promise<WhatsAppResponse> {
    if (!phone || !templateName) {
      return { success: false, error: 'Telefone e nome do template sao obrigatorios.' }
    }

    // Resolve template dinamicamente para evitar import circular
    let templateFn: ((params: Record<string, string>) => string) | undefined
    try {
      const templates = await import('@/lib/whatsapp-templates')
      templateFn = (templates as Record<string, any>)[templateName]
    } catch {
      return { success: false, error: `Template "${templateName}" nao encontrado.` }
    }

    if (typeof templateFn !== 'function') {
      return { success: false, error: `Template "${templateName}" nao e uma funcao valida.` }
    }

    const text = templateFn(params)
    return this.sendWhatsAppMessage(phone, text)
  }

  // --------------------------------------------------------------------------
  // PUBLIC: Envio de midia (imagem, video, documento)
  // --------------------------------------------------------------------------

  async sendWhatsAppMedia(
    phone: string,
    mediaUrl: string,
    caption?: string,
  ): Promise<WhatsAppResponse> {
    if (!phone || !mediaUrl) {
      return { success: false, error: 'Telefone e URL da midia sao obrigatorios.' }
    }

    const normalized = normalizePhone(phone)

    // Detecta tipo de midia pela extensao
    const ext = mediaUrl.split('.').pop()?.toLowerCase() || ''
    let mediatype: 'image' | 'video' | 'document' = 'document'
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) mediatype = 'image'
    else if (['mp4', 'avi', 'mov', 'webm'].includes(ext)) mediatype = 'video'

    return this.request<EvolutionMediaPayload>('sendMedia', {
      number: normalized,
      mediatype,
      media: mediaUrl,
      caption: caption || undefined,
    })
  }

  // --------------------------------------------------------------------------
  // LEGACY: Compatibilidade com notificacoes anteriores
  // --------------------------------------------------------------------------

  async sendMessage(params: { phone: string; message: string; mediaUrl?: string }): Promise<WhatsAppResponse> {
    if (params.mediaUrl) {
      return this.sendWhatsAppMedia(params.phone, params.mediaUrl, params.message)
    }
    return this.sendWhatsAppMessage(params.phone, params.message)
  }

  async notifyApprovalRequired(params: {
    phone: string
    documentType: string
    documentId: string
    requesterName: string
  }): Promise<WhatsAppResponse> {
    const message = `Ola! Uma requisicao de ${params.documentType} (ID: ${params.documentId}) de ${params.requesterName} esta aguardando sua aprovacao. Por favor, acesse o sistema para analise.`
    return this.sendWhatsAppMessage(params.phone, message)
  }

  async notifyIncident(params: {
    phone: string
    incidentType: string
    incidentId: string
    description: string
    severity: 'baixa' | 'media' | 'alta' | 'critica'
  }): Promise<WhatsAppResponse> {
    const severityLabel: Record<string, string> = {
      'baixa': '[BAIXA]',
      'media': '[MEDIA]',
      'alta': '[ALTA]',
      'critica': '[CRITICA]',
    }
    const message = `${severityLabel[params.severity] || '[INFO]'} Incidente Detectado\n\nTipo: ${params.incidentType}\nID: ${params.incidentId}\nSeveridade: ${params.severity}\n\nDescricao: ${params.description}\n\nPor favor, acesse o sistema para mais detalhes.`
    return this.sendWhatsAppMessage(params.phone, message)
  }

  // --------------------------------------------------------------------------
  // STATUS
  // --------------------------------------------------------------------------

  getStatus(): { configured: boolean; remaining: number } {
    return {
      configured: this.isConfigured(),
      remaining: this.rateLimiter.remaining,
    }
  }
}

// Singleton export
export const whatsappService = new WhatsAppService()
