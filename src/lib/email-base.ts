// ============================================================================
// BASE TEMPLATE — HTML wrapper para todos os emails do sistema
// Separado de email.ts para evitar conflito com 'use server' (Turbopack)
// ============================================================================

const APP_NAME = 'Eixo Global ERP'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://erp.eixoglobal.com.br'

export function baseTemplate(content: string): string {
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
        @media (max-width: 640px) {
            .container { padding: 12px; }
            .card { padding: 20px; }
            .btn { display: block; text-align: center; }
        }
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
                <p>Eixo Global Serviços LTDA</p>
                <p>Este é um email automático. Não responda.</p>
            </div>
        </div>
    </div>
</body>
</html>`
}
