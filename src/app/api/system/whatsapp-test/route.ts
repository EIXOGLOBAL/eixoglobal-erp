import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { whatsappService } from "@/lib/whatsapp"

export const dynamic = "force-dynamic"

// ---------------------------------------------------------------------------
// GET /api/system/whatsapp-test — status da integracao (ADMIN only)
// ---------------------------------------------------------------------------

export async function GET() {
  const session = await getSession()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  const status = whatsappService.getStatus()

  return NextResponse.json({
    configured: status.configured,
    rateLimitRemaining: status.remaining,
    envVars: {
      EVOLUTION_API_URL: !!process.env.EVOLUTION_API_URL,
      EVOLUTION_API_KEY: !!process.env.EVOLUTION_API_KEY,
      EVOLUTION_INSTANCE: !!process.env.EVOLUTION_INSTANCE,
    },
  })
}

// ---------------------------------------------------------------------------
// POST /api/system/whatsapp-test — envia mensagem de teste (ADMIN only)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({})) as {
      phone?: string
      message?: string
      type?: 'text' | 'template' | 'media'
      templateName?: string
      templateParams?: Record<string, string>
      mediaUrl?: string
      caption?: string
    }

    if (!body.phone) {
      return NextResponse.json(
        { success: false, error: "Campo 'phone' e obrigatorio." },
        { status: 400 },
      )
    }

    const type = body.type || 'text'

    let result

    switch (type) {
      case 'template': {
        if (!body.templateName) {
          return NextResponse.json(
            { success: false, error: "Campo 'templateName' e obrigatorio para tipo 'template'." },
            { status: 400 },
          )
        }
        result = await whatsappService.sendWhatsAppTemplate(
          body.phone,
          body.templateName,
          body.templateParams || {},
        )
        break
      }

      case 'media': {
        if (!body.mediaUrl) {
          return NextResponse.json(
            { success: false, error: "Campo 'mediaUrl' e obrigatorio para tipo 'media'." },
            { status: 400 },
          )
        }
        result = await whatsappService.sendWhatsAppMedia(
          body.phone,
          body.mediaUrl,
          body.caption,
        )
        break
      }

      case 'text':
      default: {
        const message = body.message || `[TESTE] Mensagem de teste do ERP Eixo Global - ${new Date().toLocaleString('pt-BR')}`
        result = await whatsappService.sendWhatsAppMessage(body.phone, message)
        break
      }
    }

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message ?? "Erro interno" },
      { status: 500 },
    )
  }
}
