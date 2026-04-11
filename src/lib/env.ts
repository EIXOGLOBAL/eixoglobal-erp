import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  ANTHROPIC_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().default('Eixo Global ERP'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  D4SIGN_TOKEN_API: z.string().optional(),
  D4SIGN_CRYPT_KEY: z.string().optional(),
  D4SIGN_SAFE_UUID: z.string().optional(),
  D4SIGN_WEBHOOK_SECRET: z.string().optional(),
  UPLOAD_MAX_SIZE: z.string().optional(),
  PG_POOL_MAX: z.string().optional(),
})

let _env: z.infer<typeof envSchema> | null = null

export function getEnv() {
  if (!_env) {
    const result = envSchema.safeParse(process.env)
    if (!result.success) {
      // Fail fast — nunca mascarar configuração ausente. Em produção, isso
      // derruba o boot e o operator vê o erro nos logs do Dokploy.
      const errors = result.error.flatten().fieldErrors
      console.error('❌ Invalid environment variables:', errors)
      throw new Error(
        `Invalid environment variables: ${JSON.stringify(errors)}`
      )
    }
    _env = result.data
  }
  return _env
}

export type Env = z.infer<typeof envSchema>
