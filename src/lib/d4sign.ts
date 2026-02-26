/**
 * D4Sign Digital Signature HTTP Client
 *
 * Integrates with the D4Sign API (https://secure.d4sign.com.br/api/v1)
 * for managing digital document signatures.
 *
 * Features:
 * - Upload documents to a safe
 * - Add signers to a document
 * - Send documents for signature
 * - Check document status
 * - Cancel documents
 * - Download signed documents
 * - Automatic retry with exponential backoff (3 attempts)
 * - Graceful error handling when env vars are not configured
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface D4SignSigner {
  email: string
  /** 1 = Assinar, 2 = Aprovar, 3 = Reconhecer, 4 = Assinar como parte, 5 = Assinar como testemunha, 6 = Assinar como interveniente, 7 = Acusar recebimento */
  act: string
  foreign?: string
  whatsapp?: string
  phone?: string
  /** 1 = Token por e-mail (default), 2 = Token por SMS, 3 = Token por WhatsApp */
  auth_type?: string
}

export interface D4SignUploadResult {
  uuid: string
}

export interface D4SignStatusResult {
  uuid: string
  statusId: string
  statusName: string
  signers: D4SignSignerStatus[]
}

export interface D4SignSignerStatus {
  email: string
  name?: string
  status: string // "signed" | "pending" | "refused"
  signed_at?: string
}

interface D4SignError {
  message: string
  code?: string
}

interface D4SignConfig {
  tokenApi: string
  cryptKey: string
  safeUuid: string
  baseUrl: string
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function getConfig(): D4SignConfig | null {
  const tokenApi = process.env.D4SIGN_TOKEN_API
  const cryptKey = process.env.D4SIGN_CRYPT_KEY
  const safeUuid = process.env.D4SIGN_SAFE_UUID
  const baseUrl = process.env.D4SIGN_BASE_URL || 'https://secure.d4sign.com.br/api/v1'

  if (!tokenApi || !cryptKey || !safeUuid) {
    return null
  }

  return { tokenApi, cryptKey, safeUuid, baseUrl }
}

function ensureConfig(): D4SignConfig {
  const config = getConfig()
  if (!config) {
    throw new Error(
      'D4Sign nao configurado. Verifique as variaveis de ambiente: D4SIGN_TOKEN_API, D4SIGN_CRYPT_KEY, D4SIGN_SAFE_UUID'
    )
  }
  return config
}

// ---------------------------------------------------------------------------
// HTTP Helper with retry (3 attempts, 1s backoff)
// ---------------------------------------------------------------------------

async function d4signFetch<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'DELETE'
    body?: FormData | Record<string, unknown>
    isFormData?: boolean
    rawResponse?: boolean
  } = {}
): Promise<T> {
  const config = ensureConfig()
  const { method = 'GET', body, isFormData = false } = options

  const url = `${config.baseUrl}${path}`
  const maxAttempts = 3
  const backoffMs = 1000

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const headers: Record<string, string> = {
        tokenAPI: config.tokenApi,
        cryptKey: config.cryptKey,
      }

      let fetchBody: BodyInit | undefined

      if (body && isFormData) {
        // FormData — don't set Content-Type (browser will set boundary)
        fetchBody = body as FormData
      } else if (body) {
        headers['Content-Type'] = 'application/json'
        fetchBody = JSON.stringify(body)
      }

      const response = await fetch(url, {
        method,
        headers,
        body: fetchBody,
      })

      if (!response.ok) {
        let errorMsg = `D4Sign API error: ${response.status} ${response.statusText}`
        try {
          const errorBody = await response.json() as D4SignError
          if (errorBody.message) {
            errorMsg = `D4Sign: ${errorBody.message}`
          }
        } catch {
          // Could not parse error body
        }
        throw new Error(errorMsg)
      }

      if (options.rawResponse) {
        const buffer = Buffer.from(await response.arrayBuffer())
        return buffer as unknown as T
      }

      const data = (await response.json()) as T
      return data
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Only retry on network errors, not HTTP 4xx errors
      const isNetworkError =
        lastError.message.includes('fetch failed') ||
        lastError.message.includes('ECONNREFUSED') ||
        lastError.message.includes('ETIMEDOUT') ||
        lastError.message.includes('ENOTFOUND') ||
        lastError.message.includes('network')

      if (!isNetworkError || attempt === maxAttempts) {
        break
      }

      // Wait before retry with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, backoffMs * attempt))
    }
  }

  throw lastError ?? new Error('D4Sign: Erro desconhecido')
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Upload a PDF document to the D4Sign safe.
 * Returns the document UUID.
 */
export async function uploadDocument(
  pdfBuffer: Buffer,
  filename: string
): Promise<{ uuid: string }> {
  const config = ensureConfig()

  const formData = new FormData()
  const blob = new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' })
  formData.append('file', blob, filename)

  const result = await d4signFetch<{ uuid: string }>(
    `/documents/${config.safeUuid}/upload`,
    {
      method: 'POST',
      body: formData,
      isFormData: true,
    }
  )

  return { uuid: result.uuid }
}

/**
 * Add signers to a document.
 */
export async function addSigners(
  documentUuid: string,
  signers: D4SignSigner[]
): Promise<{ message: string }> {
  const result = await d4signFetch<{ message: string }>(
    `/documents/${documentUuid}/createlist`,
    {
      method: 'POST',
      body: { signers } as unknown as Record<string, unknown>,
    }
  )

  return result
}

/**
 * Send the document to signers.
 * @param workflow 0 = Simultaneous (all sign at same time), 1 = Sequential (ordered signing)
 */
export async function sendToSign(
  documentUuid: string,
  message: string,
  workflow: 0 | 1 = 0
): Promise<{ message: string }> {
  const result = await d4signFetch<{ message: string }>(
    `/documents/${documentUuid}/sendtosigner`,
    {
      method: 'POST',
      body: { message, workflow } as unknown as Record<string, unknown>,
    }
  )

  return result
}

/**
 * Get the current status of a document including signer details.
 */
export async function getDocumentStatus(
  documentUuid: string
): Promise<D4SignStatusResult> {
  const result = await d4signFetch<D4SignStatusResult>(
    `/documents/${documentUuid}/status`
  )

  return result
}

/**
 * Cancel a document on D4Sign.
 */
export async function cancelDocument(
  documentUuid: string,
  comment: string
): Promise<{ message: string }> {
  const result = await d4signFetch<{ message: string }>(
    `/documents/${documentUuid}/cancel`,
    {
      method: 'POST',
      body: { comment } as unknown as Record<string, unknown>,
    }
  )

  return result
}

/**
 * Download the signed PDF document.
 * Returns a Buffer with the PDF content.
 */
export async function downloadSignedDocument(
  documentUuid: string
): Promise<Buffer> {
  const buffer = await d4signFetch<Buffer>(
    `/documents/${documentUuid}/download`,
    {
      method: 'GET',
      rawResponse: true,
    }
  )

  return buffer
}

/**
 * Check if D4Sign is properly configured.
 */
export function isD4SignConfigured(): boolean {
  return getConfig() !== null
}
