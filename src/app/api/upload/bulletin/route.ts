import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { getSession } from '@/lib/auth'
import { saveBulletinAttachment } from '@/app/actions/bulletin-actions'

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'bulletins')
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

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
        if (!session) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const bulletinId = formData.get('bulletinId') as string | null
        const description = formData.get('description') as string | null

        if (!file || !bulletinId) {
            return NextResponse.json({ error: 'Arquivo e ID do boletim são obrigatórios' }, { status: 400 })
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'Arquivo muito grande. Máximo: 10MB' }, { status: 400 })
        }

        if (!ALLOWED_TYPES[file.type]) {
            return NextResponse.json({ error: 'Tipo de arquivo não permitido' }, { status: 400 })
        }

        // Criar diretório se não existir
        const bulletinDir = join(UPLOAD_DIR, bulletinId)
        await mkdir(bulletinDir, { recursive: true })

        // Gerar nome único
        const ext = ALLOWED_TYPES[file.type]
        const timestamp = Date.now()
        const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const savedFileName = `${timestamp}_${safeFileName}`
        const filePath = join(bulletinDir, savedFileName)

        // Salvar arquivo
        const buffer = Buffer.from(await file.arrayBuffer())
        await writeFile(filePath, buffer)

        const fileUrl = `/uploads/bulletins/${bulletinId}/${savedFileName}`

        const result = await saveBulletinAttachment(
            bulletinId,
            session.user!.id,
            {
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                fileUrl,
                description: description || undefined,
            }
        )

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 })
        }

        return NextResponse.json({ success: true, data: result.data })
    } catch (error: any) {
        console.error('Upload error:', error)
        return NextResponse.json({ error: 'Erro ao processar upload' }, { status: 500 })
    }
}
