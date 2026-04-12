import {
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  type GetObjectCommandInput,
  type DeleteObjectCommandInput,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getR2ClientInstance, getR2Config, getPublicUrl } from './r2-client'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface DownloadOptions {
  /** Tempo de expiração da URL em segundos (padrão: 3600 = 1 hora) */
  expiresIn?: number
  /** Nome do arquivo para download (Content-Disposition) */
  downloadFileName?: string
  /** Forçar download ao invés de exibir no browser */
  forceDownload?: boolean
}

export interface FileMetadata {
  /** Chave do arquivo */
  key: string
  /** Tamanho em bytes */
  size: number
  /** Tipo MIME */
  contentType: string
  /** Data da última modificação */
  lastModified: Date
  /** Metadados customizados */
  metadata?: Record<string, string>
  /** ETag do arquivo */
  etag?: string
}

export interface ListFilesOptions {
  /** Prefixo/pasta para filtrar */
  prefix?: string
  /** Número máximo de arquivos a retornar */
  maxKeys?: number
  /** Token de continuação para paginação */
  continuationToken?: string
}

export interface ListFilesResult {
  /** Lista de arquivos */
  files: FileMetadata[]
  /** Token para próxima página (se houver) */
  nextContinuationToken?: string
  /** Indica se há mais resultados */
  isTruncated: boolean
}

// ---------------------------------------------------------------------------
// Download de arquivos
// ---------------------------------------------------------------------------

/**
 * Gera uma URL assinada para download de arquivo
 * 
 * URLs assinadas permitem acesso temporário a arquivos privados sem expor
 * as credenciais do R2.
 * 
 * @param key - Chave do arquivo no bucket
 * @param options - Opções de download
 * @returns URL assinada para download
 */
export async function generatePresignedDownloadUrl(
  key: string,
  options: DownloadOptions = {}
): Promise<string> {
  const client = getR2ClientInstance()
  const config = getR2Config()

  const {
    expiresIn = 3600, // 1 hora por padrão
    downloadFileName,
    forceDownload = false,
  } = options

  // Prepara o comando de download
  const commandInput: GetObjectCommandInput = {
    Bucket: config.bucketName,
    Key: key,
  }

  // Configura o Content-Disposition se necessário
  if (downloadFileName || forceDownload) {
    const disposition = forceDownload ? 'attachment' : 'inline'
    const fileName = downloadFileName || key.split('/').pop()
    commandInput.ResponseContentDisposition = `${disposition}; filename="${fileName}"`
  }

  const command = new GetObjectCommand(commandInput)

  // Gera a URL assinada
  return getSignedUrl(client, command, { expiresIn })
}

/**
 * Obtém a URL pública de um arquivo (se o bucket for público)
 * 
 * @param key - Chave do arquivo no bucket
 * @returns URL pública do arquivo
 */
export function getFilePublicUrl(key: string): string {
  return getPublicUrl(key)
}

/**
 * Faz download direto de um arquivo (server-side)
 * 
 * Retorna o conteúdo do arquivo como Buffer. Use com cuidado para arquivos grandes.
 * 
 * @param key - Chave do arquivo no bucket
 * @returns Buffer com o conteúdo do arquivo
 */
export async function downloadFile(key: string): Promise<Buffer> {
  const client = getR2ClientInstance()
  const config = getR2Config()

  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  })

  const response = await client.send(command)

  if (!response.Body) {
    throw new Error('Arquivo não encontrado ou vazio')
  }

  // Converte o stream para buffer
  const chunks: Uint8Array[] = []
  for await (const chunk of response.Body as any) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
}

/**
 * Obtém os metadados de um arquivo sem fazer download
 * 
 * @param key - Chave do arquivo no bucket
 * @returns Metadados do arquivo
 */
export async function getFileMetadata(key: string): Promise<FileMetadata> {
  const client = getR2ClientInstance()
  const config = getR2Config()

  const command = new HeadObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  })

  const response = await client.send(command)

  return {
    key,
    size: response.ContentLength || 0,
    contentType: response.ContentType || 'application/octet-stream',
    lastModified: response.LastModified || new Date(),
    metadata: response.Metadata,
    etag: response.ETag,
  }
}

/**
 * Verifica se um arquivo existe no bucket
 * 
 * @param key - Chave do arquivo no bucket
 * @returns true se o arquivo existe, false caso contrário
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    await getFileMetadata(key)
    return true
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false
    }
    throw error
  }
}

// ---------------------------------------------------------------------------
// Listagem de arquivos
// ---------------------------------------------------------------------------

/**
 * Lista arquivos no bucket
 * 
 * @param options - Opções de listagem
 * @returns Lista de arquivos e token de paginação
 */
export async function listFiles(
  options: ListFilesOptions = {}
): Promise<ListFilesResult> {
  const client = getR2ClientInstance()
  const config = getR2Config()

  const {
    prefix,
    maxKeys = 100,
    continuationToken,
  } = options

  const command = new ListObjectsV2Command({
    Bucket: config.bucketName,
    Prefix: prefix,
    MaxKeys: maxKeys,
    ContinuationToken: continuationToken,
  })

  const response = await client.send(command)

  const files: FileMetadata[] = (response.Contents || []).map((item) => ({
    key: item.Key || '',
    size: item.Size || 0,
    contentType: 'application/octet-stream', // ListObjects não retorna ContentType
    lastModified: item.LastModified || new Date(),
    etag: item.ETag,
  }))

  return {
    files,
    nextContinuationToken: response.NextContinuationToken,
    isTruncated: response.IsTruncated || false,
  }
}

/**
 * Lista todos os arquivos de uma pasta (com paginação automática)
 * 
 * @param prefix - Prefixo/pasta para filtrar
 * @returns Lista completa de arquivos
 */
export async function listAllFiles(prefix?: string): Promise<FileMetadata[]> {
  const allFiles: FileMetadata[] = []
  let continuationToken: string | undefined

  do {
    const result = await listFiles({
      prefix,
      continuationToken,
    })

    allFiles.push(...result.files)
    continuationToken = result.nextContinuationToken
  } while (continuationToken)

  return allFiles
}

// ---------------------------------------------------------------------------
// Exclusão de arquivos
// ---------------------------------------------------------------------------

/**
 * Exclui um arquivo do bucket
 * 
 * @param key - Chave do arquivo no bucket
 */
export async function deleteFile(key: string): Promise<void> {
  const client = getR2ClientInstance()
  const config = getR2Config()

  const command: DeleteObjectCommandInput = {
    Bucket: config.bucketName,
    Key: key,
  }

  await client.send(new DeleteObjectCommand(command))
}

/**
 * Exclui múltiplos arquivos do bucket
 * 
 * @param keys - Array de chaves dos arquivos a serem excluídos
 */
export async function deleteFiles(keys: string[]): Promise<void> {
  // R2 suporta DeleteObjects, mas vamos fazer um por vez para simplicidade
  // Em produção, considere usar DeleteObjectsCommand para melhor performance
  await Promise.all(keys.map((key) => deleteFile(key)))
}

/**
 * Exclui todos os arquivos de uma pasta
 * 
 * @param prefix - Prefixo/pasta a ser excluída
 */
export async function deleteFolder(prefix: string): Promise<void> {
  const files = await listAllFiles(prefix)
  const keys = files.map((file) => file.key)

  if (keys.length > 0) {
    await deleteFiles(keys)
  }
}

// ---------------------------------------------------------------------------
// Funções auxiliares para casos de uso específicos
// ---------------------------------------------------------------------------

/**
 * Gera URL de download para nota fiscal
 */
export async function generateInvoiceDownloadUrl(
  key: string,
  fileName?: string
): Promise<string> {
  return generatePresignedDownloadUrl(key, {
    expiresIn: 3600, // 1 hora
    downloadFileName: fileName,
    forceDownload: true,
  })
}

/**
 * Gera URL de visualização para imagem de produto
 */
export async function generateProductImageUrl(key: string): Promise<string> {
  // Imagens de produtos geralmente são públicas
  // Se não forem, use presigned URL
  try {
    return getFilePublicUrl(key)
  } catch {
    return generatePresignedDownloadUrl(key, {
      expiresIn: 86400, // 24 horas
      forceDownload: false,
    })
  }
}

/**
 * Gera URL de download para contrato
 */
export async function generateContractDownloadUrl(
  key: string,
  fileName?: string
): Promise<string> {
  return generatePresignedDownloadUrl(key, {
    expiresIn: 7200, // 2 horas
    downloadFileName: fileName,
    forceDownload: true,
  })
}

/**
 * Lista todas as notas fiscais
 */
export async function listInvoices(): Promise<FileMetadata[]> {
  return listAllFiles('invoices/')
}

/**
 * Lista todas as imagens de produtos
 */
export async function listProductImages(): Promise<FileMetadata[]> {
  return listAllFiles('products/')
}

/**
 * Lista todos os contratos
 */
export async function listContracts(): Promise<FileMetadata[]> {
  return listAllFiles('contracts/')
}

/**
 * Lista todos os relatórios
 */
export async function listReports(): Promise<FileMetadata[]> {
  return listAllFiles('reports/')
}
