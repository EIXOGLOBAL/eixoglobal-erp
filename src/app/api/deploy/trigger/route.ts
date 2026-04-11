import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { logAction } from '@/lib/audit-logger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Can be triggered by admin or by deploy secret
  const authHeader = request.headers.get('authorization')
  const deploySecret = process.env.DEPLOY_SECRET

  let isAuthorized = false
  let triggeredBy = 'system'

  // Check deploy secret
  if (deploySecret && authHeader === `Bearer ${deploySecret}`) {
    isAuthorized = true
    triggeredBy = 'deploy-secret'
  }

  // Check admin session
  if (!isAuthorized) {
    const session = await getSession()
    if (session?.user?.role === 'ADMIN') {
      isAuthorized = true
      triggeredBy = session.user.name || session.user.id
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const dokployWebhookUrl = process.env.DOKPLOY_WEBHOOK_URL

    if (!dokployWebhookUrl) {
      return NextResponse.json(
        { error: 'DOKPLOY_WEBHOOK_URL não configurado' },
        { status: 500 }
      )
    }

    // Trigger Dokploy redeploy
    const response = await fetch(dokployWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Dokploy responded with ${response.status}`)
    }

    await logAction(
      'DEPLOY_TRIGGER',
      'System',
      'deploy',
      'Redeploy',
      `Triggered by: ${triggeredBy}`
    )

    return NextResponse.json({
      success: true,
      message: 'Deploy disparado com sucesso',
      triggeredBy,
    })
  } catch (error) {
    console.error('Erro ao disparar deploy:', error)
    return NextResponse.json(
      { error: 'Erro ao disparar deploy' },
      { status: 500 }
    )
  }
}
