'use server'

import nodemailer from 'nodemailer'
import type Mail from 'nodemailer/lib/mailer'
import { baseTemplate } from './email-base'

// ============================================================================
// CONFIGURAÇÃO SMTP
// ============================================================================

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@eixoglobal.com.br'
const APP_NAME = 'Eixo Global ERP'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://erp.eixoglobal.com.br'

function isSmtpConfigured(): boolean {
    return !!(SMTP_HOST && SMTP_USER && SMTP_PASS)
}

let _transporter: Mail | null = null

function getTransporter(): Mail | null {
    if (!isSmtpConfigured()) return null
    if (!_transporter) {
        _transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_PORT === 465,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        })
    }
    return _transporter
}

// ============================================================================
// RATE LIMIT — max 10 emails/minuto
// ============================================================================

const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minuto
const RATE_LIMIT_MAX = 10

const emailTimestamps: number[] = []

function checkRateLimit(): boolean {
    const now = Date.now()
    // Remove timestamps fora da janela
    while (emailTimestamps.length > 0 && emailTimestamps[0] < now - RATE_LIMIT_WINDOW_MS) {
        emailTimestamps.shift()
    }
    return emailTimestamps.length < RATE_LIMIT_MAX
}

function recordEmailSent(): void {
    emailTimestamps.push(Date.now())
}

// ============================================================================
// SEND EMAIL — com retry (2 tentativas) e fallback silencioso
// ============================================================================

export interface SendEmailOptions {
    to: string
    subject: string
    html: string
    text?: string
}

export interface SendEmailResult {
    success: boolean
    messageId?: string
    skipped?: boolean
    rateLimited?: boolean
    error?: string
}

const MAX_RETRIES = 2

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    // Fallback silencioso se SMTP não configurado
    if (!isSmtpConfigured()) {
        console.warn('[EMAIL] SMTP não configurado — email não enviado:', options.subject)
        return { success: true, skipped: true }
    }

    // Rate limit
    if (!checkRateLimit()) {
        console.warn('[EMAIL] Rate limit atingido (max 10/min) — email adiado:', options.subject)
        return { success: false, rateLimited: true, error: 'Rate limit atingido. Tente novamente em instantes.' }
    }

    const transporter = getTransporter()
    if (!transporter) {
        console.warn('[EMAIL] Transporter indisponível')
        return { success: false, error: 'Transporter indisponível' }
    }

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const info = await transporter.sendMail({
                from: `"${APP_NAME}" <${SMTP_FROM}>`,
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
            })

            recordEmailSent()
            console.log(`[EMAIL] Enviado (tentativa ${attempt}):`, info.messageId)
            return { success: true, messageId: info.messageId }
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error))
            console.error(`[EMAIL] Erro na tentativa ${attempt}/${MAX_RETRIES}:`, lastError.message)

            if (attempt < MAX_RETRIES) {
                // Aguarda 1 segundo antes de tentar novamente
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
        }
    }

    console.error('[EMAIL] Falha após todas as tentativas:', options.subject)
    return { success: false, error: lastError?.message || 'Erro ao enviar email' }
}

// ============================================================================
// VERIFICAR CONEXÃO SMTP
// ============================================================================

export async function verifySmtpConnection(): Promise<{ connected: boolean; error?: string }> {
    if (!isSmtpConfigured()) {
        return { connected: false, error: 'SMTP não configurado' }
    }

    const transporter = getTransporter()
    if (!transporter) {
        return { connected: false, error: 'Transporter indisponível' }
    }

    try {
        await transporter.verify()
        return { connected: true }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return { connected: false, error: message }
    }
}

// ============================================================================
// STATUS DO SERVIÇO
// ============================================================================

export async function getEmailServiceStatus() {
    const now = Date.now()
    const recentEmails = emailTimestamps.filter(t => t >= now - RATE_LIMIT_WINDOW_MS)
    return {
        configured: isSmtpConfigured(),
        host: SMTP_HOST || 'não configurado',
        port: SMTP_PORT,
        from: SMTP_FROM,
        rateLimitUsage: `${recentEmails.length}/${RATE_LIMIT_MAX}`,
        rateLimitRemaining: RATE_LIMIT_MAX - recentEmails.length,
    }
}

// baseTemplate importado de ./email-base (evita export sync em 'use server')

// ============================================================================
// EMAIL TEMPLATES (legado — mantidos para compatibilidade)
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
