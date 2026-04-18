import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getR2ClientInstance, getR2Config } from '@/lib/storage/r2-client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/files/[...path]
 *
 * Proxy autenticado para arquivos no R2 quando R2_PUBLIC_URL não está configurada.
 * Requer sessão válida — arquivos nunca são expostos publicamente via esta rota.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // Apenas ativo quando R2 está configurado sem URL pública
  const hasR2 = !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  )

  if (!hasR2) {
    return NextResponse.json({ error: 'Storage não configurado' }, { status: 404 })
  }

  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { path } = await params
  const key = path.join('/')

  try {
    const client = getR2ClientInstance()
    const config = getR2Config()

    const response = await client.send(
      new GetObjectCommand({ Bucket: config.bucketName, Key: key })
    )

    if (!response.Body) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
    }

    const chunks: Uint8Array[] = []
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': response.ContentType || 'application/octet-stream',
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': `inline; filename="${key.split('/').pop()}"`,
      },
    })
  } catch (error: any) {
    if (error?.name === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
    }
    console.error('[files/proxy] Erro:', error)
    return NextResponse.json({ error: 'Erro ao buscar arquivo' }, { status: 500 })
  }
}
