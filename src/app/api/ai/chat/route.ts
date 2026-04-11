import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { getActiveApiKey, aiStream } from '@/lib/ai-client'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Simple in-memory rate limiting
const rateLimits = new Map<string, { count: number; resetAt: number }>()
const MAX_MESSAGES_PER_HOUR = 30

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.user) {
    return Response.json({ error: 'Nao autenticado' }, { status: 401 })
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

  const active = await getActiveApiKey()
  if (!active) {
    return Response.json({ error: 'Nenhum provedor de IA configurado. Acesse Configuracoes > IA.' }, { status: 503 })
  }

  const body = await request.json()
  const { message, context, history } = body as {
    message: string
    context?: string
    history: { role: 'user' | 'assistant'; content: string }[]
  }

  if (!message || typeof message !== 'string') {
    return Response.json({ error: 'Mensagem invalida' }, { status: 400 })
  }

  try {
    // Build messages array from history + new message
    const messages = [
      ...history.slice(-20).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user' as const, content: context ? `[Contexto: ${context}]\n\n${message}` : message }
    ]

    const systemPrompt = `Voce e o assistente inteligente do ERP Eixo Global, especializado em gestao de obras, contratos de engenharia, folha de pagamento e controle financeiro no Brasil.

Ajude o usuario a navegar pelo sistema, interpretar dados e tomar decisoes. Responda sempre em portugues brasileiro de forma clara e objetiva.

Quando relevante, sugira qual modulo o usuario deve acessar. Para navegacao, inclua no final da sua resposta uma linha JSON com formato:
{"action":"navigate","path":"/caminho","buttonLabel":"Texto do botao"}

Modulos disponiveis:
- /dashboard — Painel principal
- /projects — Projetos
- /contratos — Contratos
- /measurements — Boletins de medicao
- /financeiro/fluxo-de-caixa — Fluxo de caixa
- /financeiro/despesas — Despesas
- /financeiro/recebiveis — Recebiveis
- /financeiro/notas — Notas fiscais
- /estoque — Estoque de materiais
- /compras — Ordens de compra
- /rh/funcionarios — Funcionarios
- /rh/alocacoes — Alocacoes
- /dep-pessoal/ferias — Ferias
- /equipamentos — Equipamentos
- /rdo — Diario de obra (RDO)
- /tarefas — Tarefas
- /comunicados — Comunicados
- /configuracoes — Configuracoes

O nome do usuario e: ${user.name || 'Usuario'}
Cargo/role: ${user.role}`

    const readable = await aiStream({
      system: systemPrompt,
      messages,
      maxTokens: 1024,
    })

    // Log audit (fire-and-forget)
    logAudit({
      action: 'AI_CHAT',
      entity: 'AIAssistant',
      userId: user.id,
      companyId: user.companyId,
    }).catch(() => {})

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
