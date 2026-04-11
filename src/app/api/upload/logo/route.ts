import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getStorageProvider, FileValidationError } from '@/lib/storage-provider'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // ---- Autenticação e autorização ----
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
      companyId?: string | null
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Apenas administradores podem alterar o logotipo' },
        { status: 403 }
      )
    }

    if (!user.companyId) {
      return NextResponse.json(
        { error: 'Usuário não vinculado a uma empresa' },
        { status: 400 }
      )
    }

    // ---- Extrair arquivo do FormData ----
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    // ---- Upload via StorageProvider ----
    const storage = getStorageProvider()
    const result = await storage.upload(file, 'logos')

    return NextResponse.json({
      success: true,
      url: result.url,
      fileName: result.fileName,
    })
  } catch (error: any) {
    // Erros de validação retornam 400
    if (error instanceof FileValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    console.error('[upload/logo] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao processar upload do logotipo' },
      { status: 500 }
    )
  }
}
