/**
 * WhatsApp Service — Integration with WhatsApp API
 *
 * Handles sending messages via WhatsApp using configured credentials
 */

interface WhatsAppMessage {
  phone: string
  message: string
  mediaUrl?: string
}

interface WhatsAppResponse {
  success: boolean
  messageId?: string
  error?: string
}

class WhatsAppService {
  private apiUrl: string
  private apiKey: string | null
  private phoneNumber: string | null

  constructor() {
    this.apiUrl = process.env.WHATSAPP_API_URL || 'https://api.whatsapp.com'
    this.apiKey = process.env.WHATSAPP_API_KEY || null
    this.phoneNumber = process.env.WHATSAPP_PHONE_NUMBER || null
  }

  isConfigured(): boolean {
    return !!this.apiKey && !!this.phoneNumber
  }

  async sendMessage(params: WhatsAppMessage): Promise<WhatsAppResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'WhatsApp service not configured. Missing API key or phone number.'
      }
    }

    try {
      const response = await fetch(`${this.apiUrl}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: params.phone,
          from: this.phoneNumber,
          message: params.message,
          mediaUrl: params.mediaUrl
        })
      })

      if (!response.ok) {
        const error = await response.text()
        return {
          success: false,
          error: `WhatsApp API error: ${response.statusText}`
        }
      }

      const data = await response.json() as { messageId?: string }
      return {
        success: true,
        messageId: data.messageId
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to send WhatsApp message: ${(error as Error).message}`
      }
    }
  }

  async notifyApprovalRequired(params: {
    phone: string
    documentType: string
    documentId: string
    requesterName: string
  }): Promise<WhatsAppResponse> {
    const message = `Olá! Uma requisição de ${params.documentType} (ID: ${params.documentId}) de ${params.requesterName} está aguardando sua aprovação. Por favor, acesse o sistema para análise.`

    return this.sendMessage({
      phone: params.phone,
      message
    })
  }

  async notifyIncident(params: {
    phone: string
    incidentType: string
    incidentId: string
    description: string
    severity: 'baixa' | 'média' | 'alta' | 'crítica'
  }): Promise<WhatsAppResponse> {
    const severityEmoji = {
      'baixa': '🟢',
      'média': '🟡',
      'alta': '🔴',
      'crítica': '⛔'
    }

    const message = `${severityEmoji[params.severity]} Incidente Detectado\n\nTipo: ${params.incidentType}\nID: ${params.incidentId}\nSeveridade: ${params.severity}\n\nDescrição: ${params.description}\n\nPor favor, acesse o sistema para mais detalhes.`

    return this.sendMessage({
      phone: params.phone,
      message
    })
  }
}

export const whatsappService = new WhatsAppService()
