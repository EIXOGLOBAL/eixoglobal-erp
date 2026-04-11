import { NextRequest, NextResponse } from 'next/server'
import { stat, open } from 'fs/promises'
import { join, normalize, resolve } from 'path'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const UPLOADS_ROOT = join(process.cwd(), 'public', 'uploads')

// MIME types for previewable files
const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

function isPathSafe(requestedPath: string): boolean {
  const normalized = normalize(requestedPath)
  // Block directory traversal
  if (normalized.includes('..')) return false
  // Block absolute paths
  if (normalized.startsWith('/')) return false
  // Block null bytes
  if (normalized.includes('\0')) return false
  return true
}

function getExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.')
  if (lastDot === -1) return ''
  return filePath.slice(lastDot).toLowerCase()
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Auth check
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Nao autorizado' },
        { status: 401 }
      )
    }

    const { path: pathSegments } = await params

    if (!pathSegments || pathSegments.length === 0) {
      return NextResponse.json(
        { error: 'Caminho do arquivo nao informado' },
        { status: 400 }
      )
    }

    // Reconstruct and validate the relative path
    const relativePath = pathSegments.join('/')

    if (!isPathSafe(relativePath)) {
      return NextResponse.json(
        { error: 'Caminho de arquivo invalido' },
        { status: 400 }
      )
    }

    const fullPath = resolve(UPLOADS_ROOT, relativePath)

    // Double-check the resolved path is still within UPLOADS_ROOT
    if (!fullPath.startsWith(UPLOADS_ROOT)) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Check file exists and is a regular file
    let fileStat
    try {
      fileStat = await stat(fullPath)
    } catch {
      return NextResponse.json(
        { error: 'Arquivo nao encontrado' },
        { status: 404 }
      )
    }

    if (!fileStat.isFile()) {
      return NextResponse.json(
        { error: 'Caminho nao corresponde a um arquivo' },
        { status: 400 }
      )
    }

    // Determine content type
    const ext = getExtension(fullPath)
    const contentType = MIME_TYPES[ext]
    if (!contentType) {
      return NextResponse.json(
        { error: 'Tipo de arquivo nao suportado para visualizacao' },
        { status: 415 }
      )
    }

    // Stream the file
    const fileHandle = await open(fullPath, 'r')
    const stream = fileHandle.readableWebStream() as ReadableStream

    const fileName = pathSegments[pathSegments.length - 1]

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': String(fileStat.size),
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('File preview error:', error)
    return NextResponse.json(
      { error: 'Erro ao processar solicitacao de arquivo' },
      { status: 500 }
    )
  }
}
