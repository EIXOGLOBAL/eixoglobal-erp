import { writeFile, mkdir, unlink } from 'fs/promises'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const MAX_IMAGE_SIZE = 5 * 1024 * 1024   // 5 MB
const MAX_DOC_SIZE   = 50 * 1024 * 1024  // 50 MB

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/png':  '.png',
  'image/jpeg': '.jpg',
  'image/jpg':  '.jpg',
  'image/svg+xml': '.svg',
  'image/webp': '.webp',
}

export interface UploadResult {
  /** URL pública ou relativa do arquivo */
  url: string
  /** Nome gerado do arquivo */
  fileName: string
}

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FileValidationError'
  }
}

// ---------------------------------------------------------------------------
// Validadores
// ---------------------------------------------------------------------------

export function validateImageFile(file: File): void {
  if (!file || file.size === 0) throw new FileValidationError('Nenhum arquivo enviado')
  if (file.size > MAX_IMAGE_SIZE) throw new FileValidationError('Arquivo muito grande. Máximo: 5 MB')
  if (!ALLOWED_IMAGE_TYPES[file.type])
    throw new FileValidationError('Tipo não permitido. Formatos aceitos: PNG, JPG, JPEG, SVG, WebP')
}

export function validateDocumentFile(file: File, allowedTypes?: Record<string, string>): void {
  if (!file || file.size === 0) throw new FileValidationError('Nenhum arquivo enviado')
  if (file.size > MAX_DOC_SIZE) throw new FileValidationError('Arquivo muito grande. Máximo: 50 MB')
  if (allowedTypes && Object.keys(allowedTypes).length > 0 && !allowedTypes[file.type])
    throw new FileValidationError(`Tipo de arquivo não permitido: ${file.type}`)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^[_.-]+/, '')
    .toLowerCase() || 'file'
}

function generateUniqueFileName(file: File, allowedTypes?: Record<string, string>): string {
  const ext = (allowedTypes && allowedTypes[file.type])
    || extname(file.name).toLowerCase()
    || '.bin'
  const sanitized = sanitizeFileName(file.name.replace(/\.[^.]+$/, ''))
  const uuid = randomUUID().split('-')[0]
  return `${uuid}_${sanitized}${ext}`
}

// ---------------------------------------------------------------------------
// Interface StorageProvider
// ---------------------------------------------------------------------------

export interface StorageProvider {
  upload(file: File, subDir: string, allowedTypes?: Record<string, string>): Promise<UploadResult>
  delete(path: string): Promise<void>
  getUrl(path: string): string
}

// ---------------------------------------------------------------------------
// LocalStorageProvider
// ---------------------------------------------------------------------------

export class LocalStorageProvider implements StorageProvider {
  private basePath: string

  constructor(basePath?: string) {
    this.basePath = basePath ?? join(process.cwd(), 'public', 'uploads')
  }

  async upload(file: File, subDir: string, allowedTypes?: Record<string, string>): Promise<UploadResult> {
    const fileName = generateUniqueFileName(file, allowedTypes)
    const dirPath = join(this.basePath, subDir)
    await mkdir(dirPath, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(join(dirPath, fileName), buffer)
    return { url: `/uploads/${subDir}/${fileName}`, fileName }
  }

  async delete(relativePath: string): Promise<void> {
    const cleanPath = relativePath.replace(/^\/uploads\//, '')
    try {
      await unlink(join(this.basePath, cleanPath))
    } catch (err: any) {
      if (err?.code !== 'ENOENT') throw err
    }
  }

  getUrl(relativePath: string): string {
    return relativePath
  }
}

// ---------------------------------------------------------------------------
// R2StorageProvider
// ---------------------------------------------------------------------------

export class R2StorageProvider implements StorageProvider {
  private client: S3Client
  private bucket: string
  private publicUrl: string

  constructor() {
    const accountId       = process.env.R2_ACCOUNT_ID!
    const accessKeyId     = process.env.R2_ACCESS_KEY_ID!
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!
    this.bucket           = process.env.R2_BUCKET_NAME!
    this.publicUrl        = process.env.R2_PUBLIC_URL || ''

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })
  }

  async upload(file: File, subDir: string, allowedTypes?: Record<string, string>): Promise<UploadResult> {
    const fileName = generateUniqueFileName(file, allowedTypes)
    const key = `${subDir}/${fileName}`
    const buffer = Buffer.from(await file.arrayBuffer())

    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
      Metadata: { uploadedAt: new Date().toISOString() },
    }))

    const url = this.publicUrl
      ? `${this.publicUrl}/${key}`
      : `/api/files/${key}`

    return { url, fileName }
  }

  async delete(path: string): Promise<void> {
    // path pode ser URL pública ou chave direta
    const key = path
      .replace(this.publicUrl ? `${this.publicUrl}/` : '/api/files/', '')
      .replace(/^\//, '')

    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
    } catch {
      // ignora se o arquivo não existir
    }
  }

  getUrl(path: string): string {
    return this.publicUrl ? `${this.publicUrl}/${path}` : `/api/files/${path}`
  }
}

// ---------------------------------------------------------------------------
// Factory — auto-detecta R2 quando as variáveis de ambiente estão presentes
// ---------------------------------------------------------------------------

let _provider: StorageProvider | null = null

export function getStorageProvider(): StorageProvider {
  if (_provider) return _provider

  const hasR2 = !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  )

  _provider = hasR2 ? new R2StorageProvider() : new LocalStorageProvider()
  return _provider
}

/** Reseta o singleton (útil em testes ou quando env vars mudam) */
export function resetStorageProvider(): void {
  _provider = null
}
