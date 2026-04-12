import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  generatePresignedDownloadUrl,
  deleteFile,
  getFileMetadata,
  fileExists,
  listFiles,
} from '@/lib/storage/download'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// GET /api/storage/files - Lista arquivos
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    // Autenticação
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Extrair parâmetros da query string
    const { searchParams } = new URL(request.url)
    const prefix = searchParams.get('prefix') || undefined
    const maxKeys = Number.parseInt(searchParams.get('maxKeys') || '100')
    const continuationToken = searchParams.get('continuationToken') || undefined

    // Lista arquivos
    const result = await listFiles({
      prefix,
      maxKeys,
      continuationToken,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error('[storage/files] Erro ao listar arquivos:', error)
    return NextResponse.json(
      { error: 'Erro ao listar arquivos' },
      { status: 500 }
    )
  }
}
