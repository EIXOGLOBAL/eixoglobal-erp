# 🚀 PLANO DE CORREÇÕES PRIORITÁRIAS

## Baseado na Auditoria Completa de 12/04/2026

---

## 🔴 SPRINT 1 - CRÍTICO (Semana 1-2)

### 1. Corrigir Erros TypeScript (37 erros)

#### 1.1 Gerar Prisma Client
```bash
npx prisma generate
```
**Status:** ✅ CONCLUÍDO

#### 1.2 Corrigir src/app/(dashboard)/equipamentos/[id]/page.tsx
**Problema:** Property 'cost', 'name', 'hours', 'days' does not exist on type 'unknown'

**Solução:**
```typescript
// Adicionar interface para tipagem
interface MaintenanceRecord {
  cost: number
  name: string
  hours: number
  days: number
}

// Usar type assertion ou validação
const maintenance = record as MaintenanceRecord
```

#### 1.3 Corrigir src/lib/ai/chat-context.ts
**Problema:** Arithmetic operations on 'unknown' type

**Solução:**
```typescript
// Validar tipo antes de operação
const value = Number(unknownValue) || 0
const result = value + 10
```

#### 1.4 Corrigir imports do Prisma
**Problema:** Cannot find module '@/lib/generated/prisma/client'

**Solução:**
```typescript
// Substituir imports
import { PrismaClient } from '@/lib/generated/prisma/client'
// por
import { prisma } from '@/lib/prisma'
```

---

### 2. Criar Middleware de Autenticação Global

**Arquivo:** `middleware.ts` (raiz do projeto)

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { validateSession } from '@/lib/single-session'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Rotas públicas
  const publicPaths = [
    '/login',
    '/register-setup',
    '/api/health',
    '/api/version',
    '/_next',
    '/favicon.ico',
  ]
  
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }
  
  // Verificar autenticação
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // Verificar sessão única
  const sessionToken = request.cookies.get('session-token')?.value
  if (sessionToken) {
    const isValid = await validateSession(session.user.id, sessionToken)
    if (!isValid) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('session')
      response.cookies.delete('session-token')
      return response
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
```

---

### 3. Revisar Raw Queries (21 ocorrências)

**Comando para encontrar:**
```bash
grep -r "prisma\.\$queryRaw\|prisma\.\$executeRaw" src --include="*.ts" -n
```

**Checklist:**
- [ ] Verificar se usa template literals (Prisma.sql)
- [ ] Garantir parametrização
- [ ] Substituir por queries Prisma quando possível
- [ ] Adicionar comentário explicando necessidade de raw query

**Exemplo de correção:**
```typescript
// ❌ ANTES (INSEGURO)
const result = await prisma.$queryRaw(`SELECT * FROM users WHERE id = ${userId}`)

// ✅ DEPOIS (SEGURO)
import { Prisma } from '@/lib/generated/prisma/client'
const result = await prisma.$queryRaw(
  Prisma.sql`SELECT * FROM users WHERE id = ${userId}`
)

// ✅ MELHOR AINDA (Usar Prisma)
const result = await prisma.user.findUnique({ where: { id: userId } })
```

---

## 🟡 SPRINT 2 - ALTO (Semana 3-4)

### 4. Implementar Rate Limiting

#### 4.1 Instalar dependências
```bash
npm install @upstash/ratelimit @upstash/redis
```

#### 4.2 Configurar Upstash Redis
1. Criar conta em https://upstash.com (gratuito)
2. Criar database Redis
3. Adicionar ao `.env`:
```env
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
```

#### 4.3 Criar lib/rate-limit.ts
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export const loginRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  analytics: true,
})

export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true,
})

export const aiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  analytics: true,
})

export const uploadRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
})
```

#### 4.4 Aplicar em rotas críticas
**Rotas prioritárias:**
- [ ] `/api/auth/*` - loginRateLimit
- [ ] `/api/ai/*` - aiRateLimit
- [ ] `/api/upload/*` - uploadRateLimit
- [ ] `/api/search` - apiRateLimit

---

### 5. Adicionar Paginação

#### 5.1 Criar helper de paginação
```typescript
// lib/pagination.ts
export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export async function paginate<T>(
  model: any,
  params: PaginationParams & { where?: any; orderBy?: any; include?: any }
): Promise<PaginatedResponse<T>> {
  const page = params.page || 1
  const pageSize = params.pageSize || 20
  const skip = (page - 1) * pageSize

  const [data, total] = await Promise.all([
    model.findMany({
      where: params.where,
      orderBy: params.orderBy,
      include: params.include,
      take: pageSize,
      skip,
    }),
    model.count({ where: params.where }),
  ])

  const totalPages = Math.ceil(total / pageSize)

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  }
}
```

#### 5.2 Aplicar em queries
**Queries prioritárias:**
- [ ] getProjects
- [ ] getFinancialRecords
- [ ] getMeasurements
- [ ] getContracts
- [ ] getEmployees
- [ ] getClients
- [ ] getSuppliers

---

### 6. Validar Variáveis de Ambiente

#### 6.1 Melhorar lib/env.ts
```typescript
import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Auth
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  
  // AI
  AI_PRIMARY_PROVIDER: z.enum(['google', 'groq', 'openrouter']).default('google'),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  
  // D4Sign
  D4SIGN_TOKEN_API: z.string().optional(),
  D4SIGN_CRYPT_KEY: z.string().optional(),
  D4SIGN_SAFE_UUID: z.string().optional(),
  D4SIGN_WEBHOOK_SECRET: z.string().optional(),
  D4SIGN_BASE_URL: z.string().url().default('https://secure.d4sign.com.br/api/v1'),
  
  // App
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().default('Eixo Global ERP'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Upload
  UPLOAD_MAX_SIZE: z.coerce.number().default(10485760),
  
  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),
  
  // WhatsApp
  EVOLUTION_API_URL: z.string().url().optional(),
  EVOLUTION_API_KEY: z.string().optional(),
  EVOLUTION_INSTANCE_NAME: z.string().optional(),
  
  // Admin
  ADMIN_RESET_TOKEN: z.string().optional(),
  
  // Rate Limiting
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

let _env: Env | null = null

export function getEnv(): Env {
  if (_env) return _env
  
  try {
    _env = envSchema.parse(process.env)
    return _env
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:')
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
    }
    throw new Error('Invalid environment variables')
  }
}

export const env = getEnv()
```

#### 6.2 Substituir process.env
**Arquivos prioritários (81 ocorrências):**
- [ ] src/lib/session.ts
- [ ] src/lib/email.ts
- [ ] src/lib/whatsapp.ts
- [ ] src/lib/ai/config.ts
- [ ] src/app/api/*/route.ts

---

## 🟢 SPRINT 3 - MÉDIO (Semana 5-8)

### 7. Implementar Testes

#### 7.1 Configurar coverage
```bash
npm run test:coverage
```

#### 7.2 Criar testes prioritários

**Server Actions:**
- [ ] user-actions.ts (createUser, updateUser, deleteUser)
- [ ] auth (login, logout, session)
- [ ] financial-actions.ts (create, update, delete)
- [ ] measurement-actions.ts (approve, reject)
- [ ] contract-actions.ts (amendments, adjustments)

**API Routes:**
- [ ] /api/auth/session-check
- [ ] /api/auth/heartbeat
- [ ] /api/ai/chat
- [ ] /api/upload/*

**Componentes:**
- [ ] Formulários críticos
- [ ] Tabelas com paginação
- [ ] Modais de confirmação

---

### 8. Remover Console.log (57 ocorrências)

#### 8.1 Adicionar ESLint rule
```json
// .eslintrc.json
{
  "rules": {
    "no-console": ["error", { "allow": ["warn", "error"] }]
  }
}
```

#### 8.2 Substituir por logger
```bash
# Encontrar todos os console.log
grep -r "console\.log" src --include="*.ts" --include="*.tsx" -n

# Substituir por logger.info, logger.debug, etc
```

**Arquivos prioritários:**
- [ ] src/lib/notification-scheduler.ts (13 ocorrências)
- [ ] src/lib/audit-logger.ts (6 ocorrências)
- [ ] src/lib/email.ts (6 ocorrências)

---

### 9. Resolver TODOs Críticos (105 ocorrências)

#### 9.1 Criar issues no GitHub
```bash
# Extrair TODOs
grep -r "TODO\|FIXME" src --include="*.ts" --include="*.tsx" -n > todos.txt
```

#### 9.2 Priorizar por módulo
1. **Financeiro** (inadimplencia, billing) - 12 TODOs
2. **Schedule** - 10 TODOs
3. **Segurança** - 3 TODOs
4. **RH** - 5 TODOs
5. **Outros** - 75 TODOs

#### 9.3 Meta: Resolver 20 TODOs neste sprint

---

## 🔵 SPRINT 4+ - BAIXO (Mês 2-3)

### 10. Error Boundaries
- [ ] Criar ErrorBoundary genérico
- [ ] Adicionar em componentes críticos
- [ ] Criar error.tsx em todas as rotas

### 11. Índices Compostos
- [ ] Analisar queries mais frequentes
- [ ] Adicionar índices compostos no schema
- [ ] Criar migration

### 12. Soft Delete Consistente
- [ ] Adicionar isDeleted/deletedAt em modelos críticos
- [ ] Criar helper softDelete()
- [ ] Atualizar queries

### 13. Lazy Loading
- [ ] Charts (Recharts)
- [ ] PDF Viewer
- [ ] Map (Leaflet)
- [ ] AI Chat

### 14. Documentação API
- [ ] Configurar Swagger
- [ ] Documentar endpoints
- [ ] Gerar docs automaticamente

### 15. Monitoramento
- [ ] Configurar Sentry
- [ ] Adicionar APM
- [ ] Configurar alertas

---

## 📊 PROGRESSO

### Sprint 1 (Crítico)
- [x] Gerar Prisma Client
- [ ] Corrigir erros TypeScript (0/37)
- [ ] Criar middleware.ts
- [ ] Revisar raw queries (0/21)

### Sprint 2 (Alto)
- [ ] Implementar rate limiting
- [ ] Adicionar paginação
- [ ] Validar variáveis de ambiente

### Sprint 3 (Médio)
- [ ] Implementar testes
- [ ] Remover console.log (0/57)
- [ ] Resolver TODOs (0/105)

### Sprint 4+ (Baixo)
- [ ] Error boundaries
- [ ] Índices compostos
- [ ] Soft delete
- [ ] Lazy loading
- [ ] Documentação
- [ ] Monitoramento

---

## 🎯 MÉTRICAS DE SUCESSO

| Métrica | Atual | Meta | Prazo |
|---------|-------|------|-------|
| Erros TypeScript | 37 | 0 | Sprint 1 |
| Cobertura de Testes | < 5% | 70% | 3 meses |
| TODOs Pendentes | 105 | < 20 | 2 meses |
| Console.log | 57 | 0 | Sprint 3 |
| Raw Queries | 21 | < 5 | Sprint 1 |
| Vulnerabilidades | 5 | 0 | Sprint 2 |

---

**Última atualização:** 12 de Abril de 2026  
**Próxima revisão:** Semanalmente
