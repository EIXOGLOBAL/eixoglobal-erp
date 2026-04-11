import { prisma } from '@/lib/prisma'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://erp.eixoglobal.com.br'

interface NotificationData {
  type: string
  title: string
  message: string
  link?: string | null
}

// Dynamically import sendEmail to gracefully handle if email.ts is incomplete
async function getSendEmail() {
  try {
    const mod = await import('@/lib/email')
    return mod.sendEmail
  } catch (error) {
    console.warn('[EmailSender] Modulo email nao disponivel:', error)
    return null
  }
}

function buildNotificationEmailHtml(notification: NotificationData, userName: string): string {
  const linkHtml = notification.link
    ? `<p style="text-align: center; margin-top: 20px;">
        <a href="${APP_URL}${notification.link}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Ver detalhes
        </a>
      </p>`
    : ''

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
    .header .logo { font-size: 24px; font-weight: 700; color: #2563eb; margin-bottom: 8px; }
    .content { color: #3f3f46; font-size: 15px; line-height: 1.6; }
    .notification-type { display: inline-block; background: #eff6ff; color: #2563eb; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
    .footer { text-align: center; color: #a1a1aa; font-size: 12px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e4e4e7; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">EIXO GLOBAL</div>
      </div>
      <div class="content">
        <span class="notification-type">${formatNotificationType(notification.type)}</span>
        <h2 style="color: #18181b; font-size: 18px; margin: 8px 0;">${notification.title}</h2>
        <p>Olá ${userName},</p>
        <p>${notification.message}</p>
        ${linkHtml}
      </div>
      <div class="footer">
        <p>Eixo Global ERP &copy; ${new Date().getFullYear()}</p>
        <p>Você recebeu este email porque suas notificações por email estão ativadas.</p>
        <p><a href="${APP_URL}/configuracoes/perfil" style="color: #2563eb;">Gerenciar preferências de email</a></p>
      </div>
    </div>
  </div>
</body>
</html>`
}

function formatNotificationType(type: string): string {
  const typeMap: Record<string, string> = {
    CONTRACT_EXPIRING: 'Contrato',
    LOW_STOCK: 'Estoque',
    EQUIPMENT_MAINTENANCE: 'Equipamento',
    SUPPLIER_DOC_EXPIRING: 'Documento',
    BUDGET_OVERRUN: 'Orcamento',
    SYSTEM_ERROR: 'Sistema',
    DATA_INCONSISTENCY: 'Dados',
    UNUSUAL_ACTIVITY: 'Segurança',
    TASK_ASSIGNED: 'Tarefa',
    TASK_COMMENT: 'Comentario',
    TASK_DUE: 'Tarefa',
    BULLETIN_SUBMITTED: 'Boletim',
    BULLETIN_APPROVED: 'Boletim',
    BULLETIN_REJECTED: 'Boletim',
  }
  return typeMap[type] || 'Notificacao'
}

/**
 * Envia email de notificacao para um usuario.
 * Verifica preferencias do usuario e existencia do modulo de email.
 * NAO bloqueia — chamado em background via .catch()
 */
export async function sendNotificationEmail(
  userId: string,
  notification: NotificationData,
  notificationId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Buscar usuario com preferencias
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        emailNotifications: true,
        emailDigest: true,
      },
    })

    if (!user) {
      return { success: false, error: 'Usuario nao encontrado' }
    }

    if (!user.email) {
      return { success: false, error: 'Usuario sem email cadastrado' }
    }

    if (!user.emailNotifications) {
      return { success: false, error: 'Notificacoes por email desativadas pelo usuario' }
    }

    // Se o usuario prefere digest, nao enviar email individual
    if (user.emailDigest) {
      return { success: false, error: 'Usuario prefere digest — email individual ignorado' }
    }

    // Import dinamico do modulo de email
    const sendEmail = await getSendEmail()
    if (!sendEmail) {
      return { success: false, error: 'Modulo de email nao disponivel' }
    }

    const html = buildNotificationEmailHtml(notification, user.name || user.email)

    const result = await sendEmail({
      to: user.email,
      subject: `[ERP] ${notification.title}`,
      html,
      text: `${notification.title}\n\n${notification.message}${notification.link ? `\n\nVer: ${APP_URL}${notification.link}` : ''}`,
    })

    // Marcar notificacao como emailSent
    if (notificationId && result.success) {
      await prisma.notification.update({
        where: { id: notificationId },
        data: { emailSent: true },
      }).catch((err: unknown) => {
        console.warn('[EmailSender] Erro ao marcar emailSent:', err)
      })
    }

    return result as { success: boolean; error?: string }
  } catch (error) {
    console.error('[EmailSender] Erro ao enviar email de notificacao:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}

/**
 * Envia emails de notificacao para multiplos usuarios em massa.
 * Processa em paralelo com limite de concorrencia.
 */
export async function sendBulkNotificationEmails(
  userIds: string[],
  notification: NotificationData,
  notificationIds?: string[]
): Promise<{ sent: number; failed: number; skipped: number }> {
  const CONCURRENCY_LIMIT = 5
  let sent = 0
  let failed = 0
  let skipped = 0

  // Processar em lotes para nao sobrecarregar o SMTP
  for (let i = 0; i < userIds.length; i += CONCURRENCY_LIMIT) {
    const batch = userIds.slice(i, i + CONCURRENCY_LIMIT)
    const batchNotifIds = notificationIds?.slice(i, i + CONCURRENCY_LIMIT)

    const results = await Promise.allSettled(
      batch.map((userId, idx) =>
        sendNotificationEmail(userId, notification, batchNotifIds?.[idx])
      )
    )

    for (const result of results) {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          sent++
        } else if (
          result.value.error?.includes('desativadas') ||
          result.value.error?.includes('digest') ||
          result.value.error?.includes('sem email')
        ) {
          skipped++
        } else {
          failed++
        }
      } else {
        failed++
      }
    }
  }

  if (sent > 0 || failed > 0) {
    console.log(`[EmailSender] Bulk: ${sent} enviados, ${failed} falharam, ${skipped} ignorados de ${userIds.length} total`)
  }

  return { sent, failed, skipped }
}
