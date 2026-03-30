import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 characters'),
  ANTHROPIC_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().default('Eixo Global ERP'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  D4SIGN_TOKEN_API: z.string().optional(),
  D4SIGN_CRYPT_KEY: z.string().optional(),
  D4SIGN_SAFE_UUID: z.string().optional(),
  D4SIGN_WEBHOOK_SECRET: z.string().optional(),
  UPLOAD_MAX_SIZE: z.string().optional(),
})

let _env: z.infer<typeof envSchema> | null = null

export function getEnv() {
  if (!_env) {
    const result = envSchema.safeParse(process.env)
    if (!result.success) {
      console.error('❌ Invalid environment variables:', result.error.flatten().fieldErrors)
      // Don't throw in production to avoid crashing
      _env = envSchema.parse({
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/eixo',
        SESSION_SECRET: process.env.SESSION_SECRET || 'default-dev-secret-change-me-min-16-chars',
      })
    } else {
      _env = result.data
    }
  }
  return _env
}

export type Env = z.infer<typeof envSchema>
