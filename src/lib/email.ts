'use server'

import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
})

const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@eixoglobal.com.br'
const APP_NAME = 'Eixo Global ERP'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://erp.eixoglobal.com.br'

// ============================================================================
// BASE TEMPLATE
// ============================================================================

function baseTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f5; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .card { background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 24px; }
        .header h1 { color: #18181b; font-size: 20px; margin: 0; }
        .header .logo { font-size: 24px; font-weight: 700; color: #2563eb; margin-bottom: 8px; }
        .content { color: #3f3f46; font-size: 15px; line-height: 1.6; }
        .btn { display: inline-block; background: #2563eb; color: #fff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; }
        .footer { text-align: center; color: #a1a1aa; font-size: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e4e4e7; }
        .info-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 16px 0; }
        .warning-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 16px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <div class="logo">EIXO GLOBAL</div>
                <h1>${APP_NAME}</h1>
            </div>
            <div class="content">
                ${content}
            </div>
            <div class="footer">
                <p>${APP_NAME} &copy; ${new Date().getFullYear()}</p>
                <p>Este é um email automático. Não responda.</p>
            </div>
        </div>
    </div>
</body>
</html>`
}

// ============================================================================
// SEND EMAIL
// ============================================================================

export async function sendEmail(options: {
    to: string
    subject: string
    html: string
    text?: string
}) {
    try {
        if (!process.env.SMTP_USER) {
            console.warn('[EMAIL] SMTP não configurado — email não enviado:', options.subject)
            return { success: true, skipped: true }
        }

        const info = await transporter.sendMail({
            from: `"${APP_NAME}" <${FROM_EMAIL}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
        })

        console.log('[EMAIL] Enviado:', info.messageId)
        return { success: true, messageId: info.messageId }
    } catch (error) {
        console.error('[EMAIL] Erro ao enviar:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Erro ao enviar email' }
    }
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

export async function sendWelcomeEmail(to: string, name: string) {
    return sendEmail({
        to,
        subject: `Bem-vindo ao ${APP_NAME}!`,
        html: baseTemplate(`
            <p>Olá <strong>${name}</strong>,</p>
            <p>Sua conta no ${APP_NAME} foi criada com sucesso.</p>
            <p>Acesse o sistema para começar:</p>
            <p style="text-align: center;">
                <a href="${APP_URL}/login" class="btn">Acessar o ERP</a>
            </p>
            <p>Se você não solicitou esta conta, ignore este email.</p>
        `),
    })
}

export async function sendPasswordResetEmail(to: string, name: string, resetToken: string) {
    const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`
    return sendEmail({
        to,
        subject: 'Recuperação de Senha',
        html: baseTemplate(`
            <p>Olá <strong>${name}</strong>,</p>
            <p>Recebemos uma solicitação de recuperação de senha para sua conta.</p>
            <p style="text-align: center;">
                <a href="${resetUrl}" class="btn">Redefinir Senha</a>
            </p>
            <div class="warning-box">
                <strong>Atenção:</strong> Este link expira em 1 hora. Se você não solicitou a recuperação, ignore este email.
            </div>
        `),
    })
}

export async function sendApprovalNotificationEmail(to: string, name: string, item: {
    type: string
    title: string
    requestedBy: string
    link: string
}) {
    return sendEmail({
        to,
        subject: `[Aprovação Pendente] ${item.type}: ${item.title}`,
        html: baseTemplate(`
            <p>Olá <strong>${name}</strong>,</p>
            <p>Há um novo item aguardando sua aprovação:</p>
            <div class="info-box">
                <p><strong>Tipo:</strong> ${item.type}</p>
                <p><strong>Título:</strong> ${item.title}</p>
                <p><strong>Solicitado por:</strong> ${item.requestedBy}</p>
            </div>
            <p style="text-align: center;">
                <a href="${APP_URL}${item.link}" class="btn">Revisar e Aprovar</a>
            </p>
        `),
    })
}

export async function sendContractExpiryAlert(to: string, name: string, contracts: Array<{
    identifier: string
    description: string
    endDate: string
    daysRemaining: number
}>) {
    const contractsList = contracts.map(c => `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e4e4e7;">${c.identifier}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e4e4e7;">${c.description || '-'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e4e4e7;">${c.endDate}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e4e4e7; color: ${c.daysRemaining <= 7 ? '#dc2626' : '#d97706'};">${c.daysRemaining} dias</td>
        </tr>
    `).join('')

    return sendEmail({
        to,
        subject: `[Alerta] ${contracts.length} contrato(s) próximo(s) do vencimento`,
        html: baseTemplate(`
            <p>Olá <strong>${name}</strong>,</p>
            <p>Os seguintes contratos estão próximos do vencimento:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <thead>
                    <tr style="background: #f4f4f5;">
                        <th style="padding: 8px; text-align: left;">Contrato</th>
                        <th style="padding: 8px; text-align: left;">Descrição</th>
                        <th style="padding: 8px; text-align: left;">Vencimento</th>
                        <th style="padding: 8px; text-align: left;">Dias</th>
                    </tr>
                </thead>
                <tbody>${contractsList}</tbody>
            </table>
            <p style="text-align: center;">
                <a href="${APP_URL}/contratos" class="btn">Ver Contratos</a>
            </p>
        `),
    })
}

export async function sendDocumentExpiryAlert(to: string, name: string, documents: Array<{
    type: string
    entityName: string
    filename: string
    expiresAt: string
    daysRemaining: number
}>) {
    const docsList = documents.map(d => `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e4e4e7;">${d.type}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e4e4e7;">${d.entityName}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e4e4e7;">${d.filename}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e4e4e7; color: ${d.daysRemaining <= 7 ? '#dc2626' : '#d97706'};">${d.daysRemaining} dias</td>
        </tr>
    `).join('')

    return sendEmail({
        to,
        subject: `[Alerta] ${documents.length} documento(s) próximo(s) do vencimento`,
        html: baseTemplate(`
            <p>Olá <strong>${name}</strong>,</p>
            <p>Os seguintes documentos estão com validade próxima ou expirada:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <thead>
                    <tr style="background: #f4f4f5;">
                        <th style="padding: 8px; text-align: left;">Tipo</th>
                        <th style="padding: 8px; text-align: left;">Entidade</th>
                        <th style="padding: 8px; text-align: left;">Arquivo</th>
                        <th style="padding: 8px; text-align: left;">Dias</th>
                    </tr>
                </thead>
                <tbody>${docsList}</tbody>
            </table>
            <p style="text-align: center;">
                <a href="${APP_URL}/fornecedores" class="btn">Ver Documentos</a>
            </p>
        `),
    })
}

export async function sendDailyReportReminder(to: string, name: string, projectName: string, date: string) {
    return sendEmail({
        to,
        subject: `[Lembrete] RDO pendente — ${projectName}`,
        html: baseTemplate(`
            <p>Olá <strong>${name}</strong>,</p>
            <p>O Relatório Diário de Obra (RDO) para o projeto <strong>${projectName}</strong> do dia <strong>${date}</strong> ainda não foi preenchido.</p>
            <p style="text-align: center;">
                <a href="${APP_URL}/rdo" class="btn">Preencher RDO</a>
            </p>
        `),
    })
}
