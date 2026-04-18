import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getStorageProvider, validateDocumentFile, FileValidationError } from '@/lib/storage-provider'
import { saveBulletinAttachment } from '@/app/actions/bulletin-actions'

export const dynamic = 'force-dynamic'

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const bulletinId = formData.get('bulletinId') as string | null
    const description = formData.get('description') as string | null

    if (!file || !bulletinId) {
      return NextResponse.json(
        { error: 'Arquivo e ID do boletim são obrigatórios' },
        { status: 400 }
      )
    }

    validateDocumentFile(file, ALLOWED_TYPES)

    const storage = getStorageProvider()
    const result = await storage.upload(file, `bulletins/${bulletinId}`, ALLOWED_TYPES)

    const attachment = await saveBulletinAttachment(
      bulletinId,
      session.user!.id,
      {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileUrl: result.url,
        description: description || undefined,
      }
    )

    if (!attachment.success) {
      return NextResponse.json({ error: attachment.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: attachment.data })
  } catch (error) {
    if (error instanceof FileValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[upload/bulletin] Erro:', error)
    return NextResponse.json({ error: 'Erro ao processar upload' }, { status: 500 })
  }
}
