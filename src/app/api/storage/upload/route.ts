import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  uploadFile,
  uploadInvoice,
  uploadProductImage,
  uploadContract,
  uploadReport,
  generatePresignedUploadUrl,
  generateInvoiceUploadUrl,
  generateProductImageUploadUrl,
  FileValidationError,
  type UploadOptions,
} from '@/lib/storage/upload'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// POST /api/storage/upload - Upload direto (server-side)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
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
      companyId?: string | null
    }

    // Extrair arquivo e opções do FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const category = formData.get('category') as string | null
    const prefix = formData.get('prefix') as string | null
    const isPublic = formData.get('public') === 'true'

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    // Determina a função de upload baseada na categoria
    let result

    switch (category) {
      case 'invoice':
        // Apenas usuários autorizados podem fazer upload de notas fiscais
        if (!['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(user.role || '')) {
          return NextResponse.json(
            { error: 'Sem permissão para upload de notas fiscais' },
            { status: 403 }
          )
        }
        result = await uploadInvoice(file)
        break

      case 'product':
        result = await uploadProductImage(file)
        break

      case 'contract':
        // Apenas usuários autorizados podem fazer upload de contratos
        if (!['ADMIN', 'MANAGER'].includes(user.role || '')) {
          return NextResponse.json(
            { error: 'Sem permissão para upload de contratos' },
            { status: 403 }
          )
        }
        result = await uploadContract(file)
        break

      case 'report':
        result = await uploadReport(file)
        break

      default:
        // Upload genérico
        const options: UploadOptions = {
          prefix: prefix || undefined,
          public: isPublic,
          metadata: {
            uploadedBy: user.id,
            uploadedAt: new Date().toISOString(),
            companyId: user.companyId || '',
          },
        }
        result = await uploadFile(file, options)
    }

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    if (error instanceof FileValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    console.error('[storage/upload] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao processar upload' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// GET /api/storage/upload - Gera presigned URL para upload direto do browser
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

    const user = session.user as {
      id: string
      role?: string | null
      companyId?: string | null
    }

    // Extrair parâmetros da query string
    const { searchParams } = new URL(request.url)
    const fileName = searchParams.get('fileName')
    const contentType = searchParams.get('contentType')
    const category = searchParams.get('category')

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: 'fileName e contentType são obrigatórios' },
        { status: 400 }
      )
    }

    // Gera presigned URL baseado na categoria
    let result

    switch (category) {
      case 'invoice':
        if (!['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(user.role || '')) {
          return NextResponse.json(
            { error: 'Sem permissão para upload de notas fiscais' },
            { status: 403 }
          )
        }
        result = await generateInvoiceUploadUrl(fileName, contentType)
        break

      case 'product':
        result = await generateProductImageUploadUrl(fileName, contentType)
        break

      default:
        const prefix = searchParams.get('prefix') || undefined
        result = await generatePresignedUploadUrl(fileName, {
          prefix,
          contentType,
          metadata: {
            uploadedBy: user.id,
            companyId: user.companyId || '',
          },
        })
    }

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    if (error instanceof FileValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    console.error('[storage/upload] Erro ao gerar presigned URL:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar URL de upload' },
      { status: 500 }
    )
  }
}
