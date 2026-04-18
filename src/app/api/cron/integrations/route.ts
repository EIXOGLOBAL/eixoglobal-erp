import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { testConnection as testDO } from '@/lib/integrations/diario-obra'
import { testConnection as testAlmob } from '@/lib/integrations/almob'

const log = logger.child({ module: 'cron-integrations' })

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, { ok: boolean; error?: string }> = {}

  // Diário de Obra — connectivity check + future sync
  if (process.env.DIARIO_OBRA_TOKEN) {
    try {
      const ok = await testDO()
      results.diario_obra = { ok }
      if (ok) log.info('Diário de Obra: conexão OK')
      else log.warn('Diário de Obra: conexão falhou')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log.error({ err }, 'Diário de Obra sync error')
      results.diario_obra = { ok: false, error: msg }
    }
  } else {
    results.diario_obra = { ok: false, error: 'DIARIO_OBRA_TOKEN não configurado' }
  }

  // Almob — connectivity check + future sync
  if (process.env.ALMOB_TOKEN) {
    try {
      const ok = await testAlmob()
      results.almob = { ok }
      if (ok) log.info('Almob: conexão OK')
      else log.warn('Almob: conexão falhou')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log.error({ err }, 'Almob sync error')
      results.almob = { ok: false, error: msg }
    }
  } else {
    results.almob = { ok: false, error: 'ALMOB_TOKEN não configurado' }
  }

  const allOk = Object.values(results).every((r) => r.ok)

  return NextResponse.json({
    success: allOk,
    timestamp: new Date().toISOString(),
    results,
  })
}
