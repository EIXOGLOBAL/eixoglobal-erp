import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Simple in-memory rate limiting
const rateLimits = new Map<string, { count: number; resetAt: number }>()
const MAX_MESSAGES_PER_HOUR = 30

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.user) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const user = session.user as { id: string; role: string; companyId: string; name?: string }

  // Rate limiting
  const now = Date.now()
  const userLimit = rateLimits.get(user.id)
  if (userLimit && now < userLimit.resetAt) {
    if (userLimit.count >= MAX_MESSAGES_PER_HOUR) {
      return Response.json({ error: 'Limite de mensagens atingido. Tente novamente em breve.' }, { status: 429 })
    }
    userLimit.count++
  } else {
    rateLimits.set(user.id, { count: 1, resetAt: now + 3600000 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'your_key_here') {
    return Response.json({ error: 'Chave da API de IA não configurada. Contate o administrador.' }, { status: 503 })
  }

  const body = await request.json()
  const { message, context, history } = body as {
    message: string
    context?: string
    history: { role: 'user' | 'assistant'; content: string }[]
  }

  if (!message || typeof message !== 'string') {
    return Response.json({ error: 'Mensagem inválida' }, { status: 400 })
  }

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey })

    // Build messages array from history + new message
    const messages = [
      ...history.slice(-20).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user' as const, content: context ? `[Contexto: ${context}]\n\n${message}` : message }
    ]

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: `Você é o assistente inteligente do ERP Eixo Global, especializado em gestão de obras, contratos de engenharia, folha de pagamento e controle financeiro no Brasil.

Ajude o usuário a navegar pelo sistema, interpretar dados e tomar decisões. Responda sempre em português brasileiro de forma clara e objetiva.

Quando relevante, sugira qual módulo o usuário deve acessar. Para navegação, inclua no final da sua resposta uma linha JSON com formato:
{"action":"navigate","path":"/caminho","buttonLabel":"Texto do botão"}

Módulos disponíveis:
- /dashboard — Painel principal
- /projects — Projetos
- /contratos — Contratos
- /measurements — Boletins de medição
- /financeiro/fluxo-de-caixa — Fluxo de caixa
- /financeiro/despesas — Despesas
- /financeiro/recebiveis — Recebíveis
- /financeiro/notas — Notas fiscais
- /estoque — Estoque de materiais
- /compras — Ordens de compra
- /rh/funcionarios — Funcionários
- /rh/alocacoes — Alocações
- /dep-pessoal/ferias — Férias
- /equipamentos — Equipamentos
- /rdo — Diário de obra (RDO)
- /tarefas — Tarefas
- /comunicados — Comunicados
- /configuracoes — Configurações

O nome do usuário é: ${user.name || 'Usuário'}
Cargo/role: ${user.role}`,
      messages,
    })

    // Log audit (fire-and-forget)
    logAudit({
      action: 'AI_CHAT',
      entity: 'AIAssistant',
      userId: user.id,
      companyId: user.companyId,
    }).catch(() => {})

    // Stream the response as text/event-stream
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Erro ao gerar resposta' })}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[AI Chat] Error:', error)
    return Response.json({ error: 'Erro interno ao processar mensagem' }, { status: 500 })
  }
}
