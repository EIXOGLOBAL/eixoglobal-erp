import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sendEmail, verifySmtpConnection, getEmailServiceStatus } from '@/lib/email'
import {
    welcomeTemplate,
    notificationTemplate,
    overdueTemplate,
    reportTemplate,
    passwordResetTemplate,
} from '@/lib/email-templates'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Auth helper — somente ADMIN
// ---------------------------------------------------------------------------

async function assertAdmin() {
    const session = await getSession()
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
        return null
    }
    return session
}

// ---------------------------------------------------------------------------
// GET /api/system/email-test — status do servico SMTP
// ---------------------------------------------------------------------------

export async function GET() {
    const session = await assertAdmin()
    if (!session) {
        return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    try {
        const status = getEmailServiceStatus()
        const connection = await verifySmtpConnection()

        return NextResponse.json({
            success: true,
            smtp: status,
            connection,
        })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro ao verificar status'
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        )
    }
}

// ---------------------------------------------------------------------------
// POST /api/system/email-test — enviar email de teste
// Body: { to: string, template?: string }
// Templates: welcome | notification | overdue | report | passwordReset | simple
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
    const session = await assertAdmin()
    if (!session) {
        return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    try {
        const body = await request.json().catch(() => ({})) as {
            to?: string
            template?: string
        }

        const to = body.to
        if (!to || typeof to !== 'string' || !to.includes('@')) {
            return NextResponse.json(
                { success: false, error: 'Campo "to" obrigatorio com email valido' },
                { status: 400 }
            )
        }

        const template = body.template || 'simple'
        let subject: string
        let html: string

        switch (template) {
            case 'welcome':
                subject = '[TESTE] Boas-vindas'
                html = welcomeTemplate(session.user.name || 'Administrador')
                break
            case 'notification':
                subject = '[TESTE] Notificacao'
                html = notificationTemplate(
                    'Notificacao de Teste',
                    'Esta e uma notificacao de teste enviada pelo painel administrativo do ERP.',
                    `${process.env.NEXT_PUBLIC_APP_URL || 'https://erp.eixoglobal.com.br'}/admin`
                )
                break
            case 'overdue':
                subject = '[TESTE] Cobranca'
                html = overdueTemplate(
                    'Cliente Teste',
                    'NF-2024-001',
                    'R$ 1.500,00',
                    '10/04/2026'
                )
                break
            case 'report':
                subject = '[TESTE] Relatorio'
                html = reportTemplate(
                    'Relatorio Financeiro Mensal',
                    new Date().toLocaleDateString('pt-BR'),
                    'Este e um relatorio de teste gerado pelo sistema para validar o servico de email.'
                )
                break
            case 'passwordReset':
                subject = '[TESTE] Redefinicao de Senha'
                html = passwordResetTemplate(
                    session.user.name || 'Administrador',
                    `${process.env.NEXT_PUBLIC_APP_URL || 'https://erp.eixoglobal.com.br'}/reset-password?token=teste-token-invalido`
                )
                break
            case 'simple':
            default:
                subject = `[TESTE] Email de teste — ${new Date().toLocaleString('pt-BR')}`
                html = `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2>Email de Teste</h2>
                        <p>Este é um email de teste enviado pelo <strong>Eixo Global ERP</strong>.</p>
                        <p>Se você recebeu este email, o serviço de email está funcionando corretamente.</p>
                        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 20px 0;">
                        <p style="color: #a1a1aa; font-size: 12px;">
                            Enviado por: ${session.user.name || session.user.email}<br>
                            Data: ${new Date().toLocaleString('pt-BR')}
                        </p>
                    </div>
                `
                break
        }

        const result = await sendEmail({ to, subject, html })

        return NextResponse.json({
            success: result.success,
            template,
            to,
            messageId: result.messageId,
            skipped: result.skipped,
            rateLimited: result.rateLimited,
            error: result.error,
        })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro ao enviar email de teste'
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        )
    }
}
