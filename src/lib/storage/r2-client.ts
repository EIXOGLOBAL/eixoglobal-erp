import { S3Client } from '@aws-sdk/client-s3'

// ---------------------------------------------------------------------------
// Configuração do Cloudflare R2
// ---------------------------------------------------------------------------

/**
 * Cliente S3 configurado para Cloudflare R2
 * 
 * R2 é compatível com S3, mas usa um endpoint diferente:
 * https://<account_id>.r2.cloudflarestorage.com
 */

export interface R2Config {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  publicUrl?: string // URL pública do bucket (se configurado com domínio customizado)
}

/**
 * Valida as variáveis de ambiente necessárias para R2
 */
function validateR2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucketName = process.env.R2_BUCKET_NAME
  const publicUrl = process.env.R2_PUBLIC_URL

  if (!accountId) {
    throw new Error('R2_ACCOUNT_ID não configurado')
  }

  if (!accessKeyId) {
    throw new Error('R2_ACCESS_KEY_ID não configurado')
  }

  if (!secretAccessKey) {
    throw new Error('R2_SECRET_ACCESS_KEY não configurado')
  }

  if (!bucketName) {
    throw new Error('R2_BUCKET_NAME não configurado')
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl,
  }
}

/**
 * Cria e retorna uma instância do cliente S3 configurado para R2
 */
export function getR2Client(): S3Client {
  const config = validateR2Config()

  // Endpoint do Cloudflare R2
  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`

  return new S3Client({
    region: 'auto', // R2 usa 'auto' como região
    endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
}

/**
 * Retorna a configuração do R2
 */
export function getR2Config(): R2Config {
  return validateR2Config()
}

/**
 * Gera a URL pública de um arquivo no R2
 * 
 * @param key - Chave do arquivo no bucket
 * @returns URL pública do arquivo
 */
export function getPublicUrl(key: string): string {
  const config = validateR2Config()

  // Se houver URL pública customizada configurada
  if (config.publicUrl) {
    return `${config.publicUrl}/${key}`
  }

  // URL padrão do R2 (requer bucket público)
  return `https://${config.bucketName}.${config.accountId}.r2.cloudflarestorage.com/${key}`
}

/**
 * Instância singleton do cliente R2
 */
let r2ClientInstance: S3Client | null = null

/**
 * Retorna a instância singleton do cliente R2
 */
export function getR2ClientInstance(): S3Client {
  if (!r2ClientInstance) {
    r2ClientInstance = getR2Client()
  }
  return r2ClientInstance
}
