import { PutObjectCommand, type PutObjectCommandInput } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getR2ClientInstance, getR2Config } from './r2-client'
import { randomUUID } from 'crypto'

// ---------------------------------------------------------------------------
// Tipos e constantes
// ---------------------------------------------------------------------------

export interface UploadOptions {
  /** Prefixo/pasta no bucket (ex: 'invoices', 'products', 'contracts') */
  prefix?: string
  /** Nome do arquivo (se não fornecido, será gerado automaticamente) */
  fileName?: string
  /** Tipo MIME do arquivo */
  contentType?: string
  /** Metadados customizados */
  metadata?: Record<string, string>
  /** Tornar o arquivo público (padrão: false) */
  public?: boolean
  /** Tempo de expiração da URL assinada em segundos (padrão: 3600) */
  expiresIn?: number
}

export interface UploadResult {
  /** Chave completa do arquivo no bucket */
  key: string
  /** URL para acesso ao arquivo */
  url: string
  /** Nome do arquivo */
  fileName: string
  /** Tamanho do arquivo em bytes */
  size: number
  /** Tipo MIME */
  contentType: string
}

export interface PresignedUploadUrl {
  /** URL assinada para upload direto do browser */
  uploadUrl: string
  /** Chave do arquivo que será criado */
  key: string
  /** Campos adicionais para o formulário (se usar POST) */
  fields?: Record<string, string>
}

// Tipos de arquivo permitidos por categoria
export const FILE_TYPES = {
  // Documentos
  documents: {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'text/plain': '.txt',
    'text/csv': '.csv',
  },
  // Imagens
  images: {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
  },
  // Notas fiscais
  invoices: {
    'application/xml': '.xml',
    'text/xml': '.xml',
    'application/pdf': '.pdf',
  },
  // Todos os tipos
  all: {},
} as const

// Tamanhos máximos por categoria (em bytes)
export const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024, // 5 MB
  document: 10 * 1024 * 1024, // 10 MB
  invoice: 5 * 1024 * 1024, // 5 MB
  default: 20 * 1024 * 1024, // 20 MB
} as const

// ---------------------------------------------------------------------------
// Validação de arquivos
// ---------------------------------------------------------------------------

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FileValidationError'
  }
}

/**
 * Valida um arquivo baseado em tipo e tamanho
 */
export function validateFile(
  file: File,
  allowedTypes?: Record<string, string>,
  maxSize?: number
): void {
  if (!file || file.size === 0) {
    throw new FileValidationError('Nenhum arquivo enviado')
  }

  if (maxSize && file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2)
    throw new FileValidationError(
      `Arquivo muito grande. Tamanho máximo: ${maxSizeMB} MB`
    )
  }

  if (allowedTypes && Object.keys(allowedTypes).length > 0) {
    if (!allowedTypes[file.type]) {
      const allowed = Object.keys(allowedTypes).join(', ')
      throw new FileValidationError(
        `Tipo de arquivo não permitido. Tipos aceitos: ${allowed}`
      )
    }
  }
}

/**
 * Sanitiza o nome do arquivo removendo caracteres especiais
 */
function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^[_.-]+/, '')
    .toLowerCase()
}

/**
 * Gera um nome único para o arquivo
 */
export function generateFileName(originalName: string, prefix?: string): string {
  const ext = originalName.substring(originalName.lastIndexOf('.'))
  const baseName = originalName.substring(0, originalName.lastIndexOf('.'))
  const sanitized = sanitizeFileName(baseName)
  const uuid = randomUUID().split('-')[0]
  const fileName = `${uuid}_${sanitized}${ext}`

  return prefix ? `${prefix}/${fileName}` : fileName
}

// ---------------------------------------------------------------------------
// Upload direto (server-side)
// ---------------------------------------------------------------------------

/**
 * Faz upload de um arquivo diretamente para o R2 (server-side)
 * 
 * @param file - Arquivo a ser enviado
 * @param options - Opções de upload
 * @returns Resultado do upload com URL e metadados
 */
export async function uploadFile(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const client = getR2ClientInstance()
  const config = getR2Config()

  const {
    prefix,
    fileName,
    contentType = file.type,
    metadata = {},
    public: isPublic = false,
  } = options

  // Gera o nome do arquivo
  const key = fileName
    ? (prefix ? `${prefix}/${fileName}` : fileName)
    : generateFileName(file.name, prefix)

  // Converte o arquivo para buffer
  const buffer = Buffer.from(await file.arrayBuffer())

  // Prepara o comando de upload
  const command: PutObjectCommandInput = {
    Bucket: config.bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    Metadata: metadata,
  }

  // Se o arquivo for público, adiciona ACL
  if (isPublic) {
    command.ACL = 'public-read'
  }

  // Executa o upload
  await client.send(new PutObjectCommand(command))

  // Retorna o resultado
  return {
    key,
    url: isPublic
      ? `${config.publicUrl || `https://${config.bucketName}.${config.accountId}.r2.cloudflarestorage.com`}/${key}`
      : key, // Se não for público, retorna apenas a chave
    fileName: key.split('/').pop() || key,
    size: file.size,
    contentType,
  }
}

// ---------------------------------------------------------------------------
// Presigned URLs (upload direto do browser)
// ---------------------------------------------------------------------------

/**
 * Gera uma URL assinada para upload direto do browser
 * 
 * Permite que o cliente faça upload diretamente para o R2 sem passar pelo servidor,
 * economizando largura de banda e melhorando a performance.
 * 
 * @param fileName - Nome do arquivo original
 * @param options - Opções de upload
 * @returns URL assinada e chave do arquivo
 */
export async function generatePresignedUploadUrl(
  fileName: string,
  options: UploadOptions = {}
): Promise<PresignedUploadUrl> {
  const client = getR2ClientInstance()
  const config = getR2Config()

  const {
    prefix,
    contentType = 'application/octet-stream',
    metadata = {},
    expiresIn = 3600, // 1 hora
  } = options

  // Gera a chave do arquivo
  const key = generateFileName(fileName, prefix)

  // Prepara o comando de upload
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType,
    Metadata: metadata,
  })

  // Gera a URL assinada
  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn,
  })

  return {
    uploadUrl,
    key,
  }
}

// ---------------------------------------------------------------------------
// Funções auxiliares para casos de uso específicos
// ---------------------------------------------------------------------------

/**
 * Upload de nota fiscal (XML ou PDF)
 */
export async function uploadInvoice(file: File): Promise<UploadResult> {
  validateFile(file, FILE_TYPES.invoices, MAX_FILE_SIZES.invoice)

  return uploadFile(file, {
    prefix: 'invoices',
    metadata: {
      category: 'invoice',
      uploadedAt: new Date().toISOString(),
    },
  })
}

/**
 * Upload de foto de produto
 */
export async function uploadProductImage(file: File): Promise<UploadResult> {
  validateFile(file, FILE_TYPES.images, MAX_FILE_SIZES.image)

  return uploadFile(file, {
    prefix: 'products',
    public: true, // Imagens de produtos geralmente são públicas
    metadata: {
      category: 'product-image',
      uploadedAt: new Date().toISOString(),
    },
  })
}

/**
 * Upload de documento de contrato
 */
export async function uploadContract(file: File): Promise<UploadResult> {
  validateFile(file, FILE_TYPES.documents, MAX_FILE_SIZES.document)

  return uploadFile(file, {
    prefix: 'contracts',
    metadata: {
      category: 'contract',
      uploadedAt: new Date().toISOString(),
    },
  })
}

/**
 * Upload de relatório/backup
 */
export async function uploadReport(file: File): Promise<UploadResult> {
  validateFile(file, FILE_TYPES.documents, MAX_FILE_SIZES.document)

  return uploadFile(file, {
    prefix: 'reports',
    metadata: {
      category: 'report',
      uploadedAt: new Date().toISOString(),
    },
  })
}

/**
 * Gera presigned URL para upload de nota fiscal
 */
export async function generateInvoiceUploadUrl(
  fileName: string,
  contentType: string
): Promise<PresignedUploadUrl> {
  // Valida o tipo de arquivo
  if (!FILE_TYPES.invoices[contentType as keyof typeof FILE_TYPES.invoices]) {
    throw new FileValidationError(
      'Tipo de arquivo não permitido para notas fiscais. Use XML ou PDF.'
    )
  }

  return generatePresignedUploadUrl(fileName, {
    prefix: 'invoices',
    contentType,
    metadata: {
      category: 'invoice',
    },
  })
}

/**
 * Gera presigned URL para upload de imagem de produto
 */
export async function generateProductImageUploadUrl(
  fileName: string,
  contentType: string
): Promise<PresignedUploadUrl> {
  // Valida o tipo de arquivo
  if (!FILE_TYPES.images[contentType as keyof typeof FILE_TYPES.images]) {
    throw new FileValidationError(
      'Tipo de arquivo não permitido para imagens. Use JPEG, PNG, GIF, WebP ou SVG.'
    )
  }

  return generatePresignedUploadUrl(fileName, {
    prefix: 'products',
    contentType,
    metadata: {
      category: 'product-image',
    },
  })
}
