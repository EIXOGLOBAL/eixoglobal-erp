import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  generatePresignedDownloadUrl,
  deleteFile,
  getFileMetadata,
  fileExists,
} from '@/lib/storage/download'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// GET /api/storage/files/[key] - Gera URL de download ou retorna metadados
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    // Autenticação
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { key } = await params

    // Decodifica a chave (pode vir URL encoded)
    const decodedKey = decodeURIComponent(key)

    // Verifica se o arquivo existe
    const exists = await fileExists(decodedKey)
    if (!exists) {
      return NextResponse.json(
        { error: 'Arquivo não encontrado' },
        { status: 404 }
      )
    }

    // Extrair parâmetros da query string
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'download'
    const fileName = searchParams.get('fileName') || undefined
    const expiresIn = Number.parseInt(searchParams.get('expiresIn') || '3600')

    if (action === 'metadata') {
      // Retorna apenas os metadados
      const metadata = await getFileMetadata(decodedKey)
      return NextResponse.json({
        success: true,
        metadata,
      })
    }

    // Gera URL de download
    const downloadUrl = await generatePresignedDownloadUrl(decodedKey, {
      expiresIn,
      downloadFileName: fileName,
      forceDownload: action === 'download',
    })

    return NextResponse.json({
      success: true,
      downloadUrl,
      key: decodedKey,
      expiresIn,
    })
  } catch (error: any) {
    console.error('[storage/files/[key]] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao processar requisição' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/storage/files/[key] - Exclui um arquivo
// ---------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    // Autenticação
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const user = session.user as {
      id: string
      role?: string | null
    }

    const { key } = await params

    // Decodifica a chave
    const decodedKey = decodeURIComponent(key)

    // Verifica se o arquivo existe
    const exists = await fileExists(decodedKey)
    if (!exists) {
      return NextResponse.json(
        { error: 'Arquivo não encontrado' },
        { status: 404 }
      )
    }

    // Verifica permissões baseado no prefixo do arquivo
    const prefix = decodedKey.split('/')[0]

    // Contratos e notas fiscais só podem ser excluídos por admins/managers
    if (['contracts', 'invoices'].includes(prefix)) {
      if (!['ADMIN', 'MANAGER'].includes(user.role || '')) {
        return NextResponse.json(
          { error: 'Sem permissão para excluir este tipo de arquivo' },
          { status: 403 }
        )
      }
    }

    // Exclui o arquivo
    await deleteFile(decodedKey)

    return NextResponse.json({
      success: true,
      message: 'Arquivo excluído com sucesso',
      key: decodedKey,
    })
  } catch (error: any) {
    console.error('[storage/files/[key]] Erro ao excluir:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir arquivo' },
      { status: 500 }
    )
  }
}
