import { z } from 'zod'

/**
 * Environment Variables Validation
 * 
 * Valida e tipifica variáveis de ambiente em tempo de build/runtime
 * Previne erros de configuração em produção
 */

// Schema de validação
const envSchema = z.object({
  // Node
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),

  // Session & Auth
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET deve ter pelo menos 32 caracteres'),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32).optional(),

  // Rate Limiting (Upstash Redis)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // AI Providers (opcionais)
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),

  // D4Sign (assinatura digital)
  D4SIGN_API_KEY: z.string().optional(),
  D4SIGN_CRYPTO_KEY: z.string().optional(),

  // Email (opcional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),

  // Storage
  STORAGE_TYPE: z.enum(['local', 's3', 'cloudflare']).default('local'),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),

  // Monitoring (opcional)
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),

  // App Config
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().default('EIXO Global ERP'),
})

// Tipo inferido do schema
export type Env = z.infer<typeof envSchema>

// Cache da validação
let cachedEnv: Env | null = null

/**
 * Valida e retorna variáveis de ambiente
 * Lança erro se alguma variável obrigatória estiver faltando ou inválida
 */
export function getEnv(): Env {
  // Retornar cache se já validado
  if (cachedEnv) {
    return cachedEnv
  }

  try {
    cachedEnv = envSchema.parse(process.env)
    return cachedEnv
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
        .join('\n')

      throw new Error(
        `❌ Erro de configuração - Variáveis de ambiente inválidas:\n${missingVars}\n\nVerifique seu arquivo .env`
      )
    }
    throw error
  }
}

/**
 * Valida variáveis de ambiente sem lançar erro
 * Útil para verificações condicionais
 */
export function validateEnv(): { success: boolean; errors?: string[] } {
  try {
    envSchema.parse(process.env)
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.issues.map((err) => `${err.path.join('.')}: ${err.message}`),
      }
    }
    return { success: false, errors: ['Erro desconhecido na validação'] }
  }
}

/**
 * Verifica se está em ambiente de produção
 */
export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production'
}

/**
 * Verifica se está em ambiente de desenvolvimento
 */
export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === 'development'
}

/**
 * Verifica se está em ambiente de teste
 */
export function isTest(): boolean {
  return getEnv().NODE_ENV === 'test'
}

/**
 * Verifica se rate limiting está configurado
 */
export function isRateLimitConfigured(): boolean {
  const env = getEnv()
  return !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN)
}

/**
 * Verifica se algum provider de IA está configurado
 */
export function hasAIProvider(): boolean {
  const env = getEnv()
  return !!(
    env.OPENAI_API_KEY ||
    env.ANTHROPIC_API_KEY ||
    env.GOOGLE_AI_API_KEY ||
    env.GROQ_API_KEY ||
    env.OPENROUTER_API_KEY
  )
}

/**
 * Verifica se D4Sign está configurado
 */
export function isD4SignConfigured(): boolean {
  const env = getEnv()
  return !!(env.D4SIGN_API_KEY && env.D4SIGN_CRYPTO_KEY)
}

/**
 * Verifica se email está configurado
 */
export function isEmailConfigured(): boolean {
  const env = getEnv()
  return !!(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS)
}

/**
 * Verifica se S3 está configurado
 */
export function isS3Configured(): boolean {
  const env = getEnv()
  return env.STORAGE_TYPE === 's3' && !!(
    env.S3_BUCKET &&
    env.S3_REGION &&
    env.S3_ACCESS_KEY &&
    env.S3_SECRET_KEY
  )
}

/**
 * Verifica se Sentry está configurado
 */
export function isSentryConfigured(): boolean {
  const env = getEnv()
  return !!env.SENTRY_DSN
}

// Validar no startup (apenas em produção)
if (process.env.NODE_ENV === 'production') {
  getEnv()
}
