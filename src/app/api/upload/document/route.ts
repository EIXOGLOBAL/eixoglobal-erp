import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

const ALLOWED_MIME_TYPES: Record<string, string> = {
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
  'application/dwg': '.dwg',
  'application/dxf': '.dxf',
  'application/octet-stream': '.bin',
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^[_.-]+/, '')
    .toLowerCase() || 'file'
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

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Tamanho maximo: 50 MB' },
        { status: 400 }
      )
    }

    // Determinar extensao
    const mimeExt = ALLOWED_MIME_TYPES[file.type]
    const originalExt = extname(file.name).toLowerCase()
    const ext = mimeExt || originalExt || '.bin'

    const sanitized = sanitizeFileName(file.name.replace(/\.[^.]+$/, ''))
    const uuid = randomUUID().split('-')[0]
    const fileName = `${uuid}_${sanitized}${ext}`

    // Salvar em public/uploads/documents/ (preparado para migracao S3)
    const basePath = join(process.cwd(), 'public', 'uploads', 'documents')
    await mkdir(basePath, { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(join(basePath, fileName), buffer)

    const url = `/uploads/documents/${fileName}`

    return NextResponse.json({
      success: true,
      url,
      fileName,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
    })
  } catch (error) {
    console.error('[upload/document] Erro:', error)
    return NextResponse.json(
      { error: 'Erro ao processar upload do documento' },
      { status: 500 }
    )
  }
}
