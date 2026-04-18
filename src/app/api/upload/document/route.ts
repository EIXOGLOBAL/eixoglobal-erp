import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getStorageProvider, validateDocumentFile, FileValidationError } from '@/lib/storage-provider'

export const dynamic = 'force-dynamic'

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/zip': '.zip',
  'application/x-rar-compressed': '.rar',
  'application/x-7z-compressed': '.7z',
  'application/octet-stream': '.bin',
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    validateDocumentFile(file, ALLOWED_TYPES)

    const storage = getStorageProvider()
    const result = await storage.upload(file, 'documents', ALLOWED_TYPES)

    return NextResponse.json({
      success: true,
      url: result.url,
      fileName: result.fileName,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
    })
  } catch (error) {
    if (error instanceof FileValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('[upload/document] Erro:', error)
    return NextResponse.json({ error: 'Erro ao processar upload do documento' }, { status: 500 })
  }
}
