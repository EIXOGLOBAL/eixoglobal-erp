import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  generateExecutiveReport,
  generateProjectReport,
  generateFinancialReport,
  generateHRReport,
} from '@/lib/pdf-generator'

export const dynamic = 'force-dynamic'

interface ReportRequestBody {
  type: 'executive' | 'project' | 'financial' | 'hr'
  companyId?: string
  projectId?: string
  period?: { start: string; end: string }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticacao
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado. Faça login para continuar.' },
        { status: 401 }
      )
    }

    const user = session.user as {
      id: string
      name?: string
      role: string
      companyId?: string
    }

    // Verificar permissao: apenas ADMIN e MANAGER podem gerar relatorios
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Sem permissão. Apenas administradores e gerentes podem gerar relatórios.' },
        { status: 403 }
      )
    }

    // Ler body
    const body: ReportRequestBody = await request.json()

    if (!body.type) {
      return NextResponse.json(
        { error: 'Tipo de relatório não informado.' },
        { status: 400 }
      )
    }

    const validTypes = ['executive', 'project', 'financial', 'hr']
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: `Tipo de relatorio invalido. Use: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const userName = user.name || 'Usuario'
    const companyId = body.companyId || user.companyId

    // Periodo padrao: ultimos 30 dias
    const period = body.period
      ? {
          start: new Date(body.period.start),
          end: new Date(body.period.end),
        }
      : {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date(),
        }

    let buffer: Buffer

    switch (body.type) {
      case 'executive': {
        if (!companyId) {
          return NextResponse.json(
            { error: 'ID da empresa e obrigatorio para o relatorio executivo.' },
            { status: 400 }
          )
        }
        buffer = await generateExecutiveReport(companyId, period, userName)
        break
      }

      case 'project': {
        if (!body.projectId) {
          return NextResponse.json(
            { error: 'ID do projeto e obrigatorio para o relatorio de projeto.' },
            { status: 400 }
          )
        }
        buffer = await generateProjectReport(body.projectId, userName)
        break
      }

      case 'financial': {
        if (!companyId) {
          return NextResponse.json(
            { error: 'ID da empresa e obrigatorio para o relatorio financeiro.' },
            { status: 400 }
          )
        }
        buffer = await generateFinancialReport(companyId, period, userName)
        break
      }

      case 'hr': {
        if (!companyId) {
          return NextResponse.json(
            { error: 'ID da empresa e obrigatorio para o relatorio de RH.' },
            { status: 400 }
          )
        }
        buffer = await generateHRReport(companyId, period, userName)
        break
      }

      default:
        return NextResponse.json(
          { error: 'Tipo de relatório não suportado.' },
          { status: 400 }
        )
    }

    // Gerar nome do arquivo com data
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10) // yyyy-mm-dd
    const filename = `relatorio-eixo-global-${body.type}-${dateStr}.pdf`

    // Retornar PDF
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Erro na API de relatorios PDF:', error)
    const message =
      error instanceof Error
        ? error.message
        : 'Erro interno ao gerar relatorio.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
