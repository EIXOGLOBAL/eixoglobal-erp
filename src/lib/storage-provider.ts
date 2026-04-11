import { writeFile, mkdir, unlink } from 'fs/promises'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'

// ---------------------------------------------------------------------------
// Tipos e constantes
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/svg+xml': '.svg',
  'image/webp': '.webp',
}

export interface UploadResult {
  url: string       // caminho relativo servido pelo Next.js (ex: /uploads/logos/uuid.png)
  fileName: string  // nome gerado no disco
}

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FileValidationError'
  }
}

// ---------------------------------------------------------------------------
// Interface StorageProvider
// ---------------------------------------------------------------------------

export interface StorageProvider {
  /** Faz upload de um arquivo e retorna a URL relativa */
  upload(file: File, subDir: string): Promise<UploadResult>
  /** Remove um arquivo pelo caminho relativo retornado por upload() */
  delete(relativePath: string): Promise<void>
  /** Retorna a URL pública a partir do caminho relativo */
  getUrl(relativePath: string): string
}

// ---------------------------------------------------------------------------
// Validadores reutilizáveis
// ---------------------------------------------------------------------------

export function validateImageFile(file: File): void {
  if (!file || file.size === 0) {
    throw new FileValidationError('Nenhum arquivo enviado')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new FileValidationError('Arquivo muito grande. Tamanho máximo: 2 MB')
  }

  if (!ALLOWED_IMAGE_TYPES[file.type]) {
    throw new FileValidationError(
      'Tipo de arquivo não permitido. Formatos aceitos: PNG, JPG, JPEG, SVG, WebP'
    )
  }
}

/** Sanitiza o nome do arquivo removendo caracteres especiais */
function sanitizeFileName(name: string): string {
  const base = name
    .replace(/[^a-zA-Z0-9._-]/g, '_')  // remove caracteres especiais
    .replace(/_{2,}/g, '_')              // remove underscores duplicados
    .replace(/^[_.-]+/, '')              // remove prefixos perigosos
    .toLowerCase()

  return base || 'file'
}

/** Gera um nome único com UUID preservando a extensão do tipo MIME */
function generateUniqueFileName(file: File): string {
  const ext = ALLOWED_IMAGE_TYPES[file.type] || extname(file.name) || '.bin'
  const sanitized = sanitizeFileName(file.name.replace(/\.[^.]+$/, ''))
  const uuid = randomUUID().split('-')[0] // 8 caracteres é suficiente
  return `${uuid}_${sanitized}${ext}`
}

// ---------------------------------------------------------------------------
// LocalStorageProvider — salva em public/uploads/
// ---------------------------------------------------------------------------

export class LocalStorageProvider implements StorageProvider {
  private basePath: string

  constructor(basePath?: string) {
    this.basePath = basePath ?? join(process.cwd(), 'public', 'uploads')
  }

  async upload(file: File, subDir: string): Promise<UploadResult> {
    validateImageFile(file)

    const fileName = generateUniqueFileName(file)
    const dirPath = join(this.basePath, subDir)

    await mkdir(dirPath, { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(join(dirPath, fileName), buffer)

    const url = `/uploads/${subDir}/${fileName}`

    return { url, fileName }
  }

  async delete(relativePath: string): Promise<void> {
    // relativePath é algo como /uploads/logos/uuid_name.png
    const cleanPath = relativePath.replace(/^\/uploads\//, '')
    const fullPath = join(this.basePath, cleanPath)

    try {
      await unlink(fullPath)
    } catch (err: any) {
      // Arquivo já não existe — não é um erro crítico
      if (err?.code !== 'ENOENT') throw err
    }
  }

  getUrl(relativePath: string): string {
    return relativePath
  }
}

// ---------------------------------------------------------------------------
// S3StorageProvider — placeholder para implementação futura
// ---------------------------------------------------------------------------
//
// export class S3StorageProvider implements StorageProvider {
//   private bucket: string
//   private region: string
//   private client: S3Client
//
//   constructor(config: { bucket: string; region: string }) {
//     this.bucket = config.bucket
//     this.region = config.region
//     // this.client = new S3Client({ region: this.region })
//   }
//
//   async upload(file: File, subDir: string): Promise<UploadResult> {
//     validateImageFile(file)
//     const fileName = generateUniqueFileName(file)
//     const key = `${subDir}/${fileName}`
//     // await this.client.send(new PutObjectCommand({ ... }))
//     const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`
//     return { url, fileName }
//   }
//
//   async delete(relativePath: string): Promise<void> {
//     // await this.client.send(new DeleteObjectCommand({ ... }))
//   }
//
//   getUrl(relativePath: string): string {
//     return `https://${this.bucket}.s3.${this.region}.amazonaws.com${relativePath}`
//   }
// }

// ---------------------------------------------------------------------------
// Instância padrão — troque por S3StorageProvider quando necessário
// ---------------------------------------------------------------------------

export function getStorageProvider(): StorageProvider {
  // Futuramente: if (process.env.STORAGE_PROVIDER === 's3') return new S3StorageProvider(...)
  return new LocalStorageProvider()
}
