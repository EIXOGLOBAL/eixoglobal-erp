import { baseTemplate } from '@/lib/email-base'

const APP_NAME = 'Eixo Global ERP'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://erp.eixoglobal.com.br'

// ============================================================================
// TEMPLATE: BOAS-VINDAS
// ============================================================================

export function welcomeTemplate(userName: string): string {
    return baseTemplate(`
        <h2 style="color: #18181b; margin: 0 0 16px 0;">Bem-vindo ao ${APP_NAME}!</h2>
        <p>Olá <strong>${userName}</strong>,</p>
        <p>Sua conta foi criada com sucesso no <strong>${APP_NAME}</strong>. Estamos felizes em tê-lo conosco!</p>
        <div class="info-box">
            <p><strong>O que você pode fazer:</strong></p>
            <ul style="margin: 8px 0; padding-left: 20px;">
                <li>Gerenciar projetos e obras</li>
                <li>Controlar financeiro e fluxo de caixa</li>
                <li>Emitir relatórios e documentos</li>
                <li>Acompanhar contratos e fornecedores</li>
            </ul>
        </div>
        <p style="text-align: center;">
            <a href="${APP_URL}/login" class="btn">Acessar o Sistema</a>
        </p>
        <p style="color: #71717a; font-size: 13px;">Se você não solicitou esta conta, por favor ignore este email ou entre em contato com o administrador.</p>
    `)
}

// ============================================================================
// TEMPLATE: NOTIFICACAO GENERICA
// ============================================================================

export function notificationTemplate(title: string, message: string, actionUrl?: string): string {
    const actionButton = actionUrl
        ? `<p style="text-align: center;"><a href="${actionUrl}" class="btn">Ver Detalhes</a></p>`
        : ''

    return baseTemplate(`
        <h2 style="color: #18181b; margin: 0 0 16px 0;">${title}</h2>
        <p>${message}</p>
        ${actionButton}
    `)
}

// ============================================================================
// TEMPLATE: COBRANCA DE INADIMPLENCIA
// ============================================================================

export function overdueTemplate(
    clientName: string,
    invoiceNumber: string,
    amount: string,
    dueDate: string
): string {
    return baseTemplate(`
        <h2 style="color: #dc2626; margin: 0 0 16px 0;">Fatura em Atraso</h2>
        <p>Prezado(a) <strong>${clientName}</strong>,</p>
        <p>Identificamos que a fatura abaixo encontra-se em atraso. Solicitamos a regularizacao o mais breve possivel.</p>
        <div class="warning-box">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 4px 0;"><strong>Fatura:</strong></td>
                    <td style="padding: 4px 0;">${invoiceNumber}</td>
                </tr>
                <tr>
                    <td style="padding: 4px 0;"><strong>Valor:</strong></td>
                    <td style="padding: 4px 0; font-weight: 600; color: #dc2626;">${amount}</td>
                </tr>
                <tr>
                    <td style="padding: 4px 0;"><strong>Vencimento:</strong></td>
                    <td style="padding: 4px 0;">${dueDate}</td>
                </tr>
            </table>
        </div>
        <p>Caso o pagamento ja tenha sido efetuado, por favor desconsidere esta mensagem.</p>
        <p>Em caso de duvidas, entre em contato com nosso departamento financeiro.</p>
        <p style="text-align: center;">
            <a href="${APP_URL}" class="btn">Acessar o Sistema</a>
        </p>
    `)
}

// ============================================================================
// TEMPLATE: ENVIO DE RELATORIO
// ============================================================================

export function reportTemplate(
    reportName: string,
    reportDate: string,
    summary: string
): string {
    return baseTemplate(`
        <h2 style="color: #18181b; margin: 0 0 16px 0;">Relatorio: ${reportName}</h2>
        <p>Segue o relatorio gerado pelo sistema:</p>
        <div class="info-box">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 4px 0;"><strong>Relatorio:</strong></td>
                    <td style="padding: 4px 0;">${reportName}</td>
                </tr>
                <tr>
                    <td style="padding: 4px 0;"><strong>Data:</strong></td>
                    <td style="padding: 4px 0;">${reportDate}</td>
                </tr>
            </table>
        </div>
        <h3 style="color: #3f3f46; margin: 16px 0 8px 0;">Resumo</h3>
        <p>${summary}</p>
        <p style="text-align: center;">
            <a href="${APP_URL}/relatorios" class="btn">Ver Relatório Completo</a>
        </p>
    `)
}

// ============================================================================
// TEMPLATE: RESET DE SENHA
// ============================================================================

export function passwordResetTemplate(userName: string, resetUrl: string): string {
    return baseTemplate(`
        <h2 style="color: #18181b; margin: 0 0 16px 0;">Redefinição de Senha</h2>
        <p>Olá <strong>${userName}</strong>,</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>${APP_NAME}</strong>.</p>
        <p>Clique no botão abaixo para criar uma nova senha:</p>
        <p style="text-align: center;">
            <a href="${resetUrl}" class="btn">Redefinir Minha Senha</a>
        </p>
        <div class="warning-box">
            <strong>Importante:</strong>
            <ul style="margin: 8px 0; padding-left: 20px;">
                <li>Este link expira em <strong>1 hora</strong>.</li>
                <li>Se você não solicitou essa alteração, ignore este email.</li>
                <li>Sua senha atual permanece inalterada até que você crie uma nova.</li>
            </ul>
        </div>
        <p style="color: #71717a; font-size: 13px;">Se você está tendo problemas com o botão, copie e cole o link abaixo no navegador:</p>
        <p style="color: #71717a; font-size: 12px; word-break: break-all;">${resetUrl}</p>
    `)
}
