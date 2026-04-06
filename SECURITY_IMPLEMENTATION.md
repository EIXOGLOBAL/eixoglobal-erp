# Security Hardening Implementation Guide

## Overview
This document details the security hardening implemented in the Eixo Global ERP system.

## Files Implemented

### 1. Request Middleware (`middleware.ts`)
**Location**: `/middleware.ts` (root level)
**Purpose**: Global request authentication and authorization

#### Features:
- JWT session token verification using jose library
- Public path whitelist for unauthenticated access
- Automatic redirect to login for invalid/missing sessions
- Static file and Next.js internal path exceptions

#### Public Paths (Whitelisted):
- `/login` - Login page
- `/setup` - Initial setup
- `/register-setup` - Registration setup
- `/api/webhooks` - Third-party webhooks
- `/api/cron` - Cron job endpoints
- `/api/ai/health` - Health check endpoint

#### Usage:
The middleware is automatically applied to all routes via the matcher configuration. No additional setup required.

### 2. Environment Validation (`src/lib/env.ts`)
**Purpose**: Type-safe environment variable management with validation

#### Usage:
```typescript
import { getEnv } from '@/lib/env'

const env = getEnv()
console.log(env.DATABASE_URL)
console.log(env.SESSION_SECRET)
```

#### Validated Variables:
- `DATABASE_URL` (required, min 1 char)
- `SESSION_SECRET` (required, min 16 chars)
- `ANTHROPIC_API_KEY` (optional)
- `NODE_ENV` (enum: development, production, test)
- `NEXT_PUBLIC_APP_URL` (optional)
- `NEXT_PUBLIC_APP_NAME` (default: "Eixo Global ERP")
- SMTP variables (optional)
- D4SIGN variables (optional)
- `UPLOAD_MAX_SIZE` (optional)

### 3. Password Policy (`src/lib/password-policy.ts`)
**Purpose**: Strong password validation and enforcement

#### Usage:
```typescript
import { validatePassword } from '@/lib/password-policy'

const result = validatePassword('MyPassword123!')
console.log(result.valid) // true
console.log(result.strength) // 'strong' | 'medium' | 'weak'
console.log(result.errors) // ['Erro 1', 'Erro 2']
```

#### Requirements:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\\/?)

#### Strength Levels:
- **Weak**: Fails 3+ requirements
- **Medium**: 1-2 failures OR valid password with 8-11 chars
- **Strong**: All requirements met AND 12+ characters

### 4. Security Headers (`next.config.ts`)
**Purpose**: HTTP security headers protection

#### Headers Applied:
- `X-Frame-Options: DENY` - Prevents clickjacking/framing attacks
- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer info
- `X-XSS-Protection: 1; mode=block` - Legacy XSS protection
- `Permissions-Policy: camera=(), microphone=(), geolocation=(self)` - Device access restrictions

### 5. Pagination Utilities (`src/lib/pagination.ts`)
**Purpose**: Safe and consistent pagination across API endpoints

#### Usage:
```typescript
import { getPaginationArgs, paginatedResponse } from '@/lib/pagination'

const { skip, take, page, pageSize } = getPaginationArgs({
  page: 2,
  pageSize: 50,
})

const data = await prisma.model.findMany({ skip, take })
const total = await prisma.model.count()

const response = paginatedResponse(data, total, page, pageSize)
// {
//   data: [...],
//   pagination: {
//     page: 2,
//     pageSize: 50,
//     total: 150,
//     totalPages: 3
//   }
// }
```

#### Safety Features:
- Maximum pageSize of 100 (prevents resource exhaustion)
- Minimum pageSize of 1
- Page validation (minimum 1)

### 6. Query Filters (`src/lib/filters.ts`)
**Purpose**: Safe Prisma query construction with filtering

#### Usage:
```typescript
import { buildWhereClause } from '@/lib/filters'

const where = buildWhereClause(
  {
    search: 'John',
    status: ['active', 'pending'],
    dateFrom: '2026-01-01',
    dateTo: '2026-03-31',
  },
  ['name', 'email'] // searchFields
)

const results = await prisma.user.findMany({ where })
```

#### Filter Types:
- `search`: Case-insensitive full-text search across specified fields
- `status`: Single value or array of values
- `dateFrom`/`dateTo`: Date range filtering on createdAt
- Custom filters: Any additional key-value pairs passed through

### 7. Audit Logging (`src/lib/audit-logger.ts`)
**Purpose**: Security audit trail for compliance and forensics

#### Usage:
```typescript
import { logAudit, getAuditLogs } from '@/lib/audit-logger'

// Log an action
await logAudit({
  userId: 'user-123',
  companyId: 'company-456',
  action: 'UPDATE',
  entity: 'User',
  entityId: 'user-123',
  details: 'Changed email address',
  oldData: { email: 'old@example.com' },
  newData: { email: 'new@example.com' },
})

// Retrieve audit logs
const logs = await getAuditLogs({
  userId: 'user-123',
  limit: 50,
})
```

#### Tracked Information:
- User ID and Company ID
- Action type (CREATE, READ, UPDATE, DELETE, etc.)
- Entity type and ID
- Timestamp
- Old/New data (JSON)
- Custom details

#### Error Handling:
Audit logging failures are logged but don't crash the application. This prevents audit issues from affecting core functionality.

## Integration Examples

### Example 1: Protecting a User List API
```typescript
// app/api/users/route.ts
import { getPaginationArgs, paginatedResponse } from '@/lib/pagination'
import { buildWhereClause } from '@/lib/filters'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const search = url.searchParams.get('search')

  const { skip, take, pageSize } = getPaginationArgs({ page, pageSize: 25 })
  const where = buildWhereClause({ search }, ['name', 'email'])

  const [data, total] = await Promise.all([
    prisma.user.findMany({ where, skip, take }),
    prisma.user.count({ where }),
  ])

  return Response.json(paginatedResponse(data, total, page, pageSize))
}
```

### Example 2: Password Change with Validation
```typescript
// app/api/users/password/route.ts
import { validatePassword } from '@/lib/password-policy'
import { getSession } from '@/lib/auth'
import { logAudit } from '@/lib/audit-logger'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const validation = validatePassword(body.newPassword)

  if (!validation.valid) {
    return Response.json({ errors: validation.errors }, { status: 400 })
  }

  const hashed = await bcrypt.hash(body.newPassword, 10)
  await prisma.user.update({
    where: { id: session.userId },
    data: { password: hashed },
  })

  await logAudit({
    userId: session.userId,
    companyId: session.companyId,
    action: 'UPDATE',
    entity: 'User',
    entityId: session.userId,
    details: 'Password changed',
  })

  return Response.json({ success: true })
}
```

## Environment Setup

### Required Variables
```bash
# Create or update .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/eixo_erp"
SESSION_SECRET="$(openssl rand -base64 32)"  # Min 16 chars, 32+ recommended
```

### Validation
The `getEnv()` function will validate all environment variables on first call. Errors are logged but won't crash development mode.

## Security Best Practices

### 1. Session Management
- SESSION_SECRET must be at least 16 characters (32+ recommended)
- Use `openssl rand -base64 32` to generate secure secrets
- Rotate secrets periodically in production
- Never commit .env files with secrets

### 2. Password Policy
- Enforce strong passwords in all user-facing forms
- Display real-time password strength feedback
- Use the color and label helpers for UI consistency

### 3. API Security
- Always check session in API routes
- Use pagination limits to prevent DoS
- Log sensitive operations via audit logger
- Never expose sensitive data in error messages

### 4. Database
- Use Prisma's parameterized queries (included in filters)
- Validate and sanitize all user inputs
- Implement row-level security where needed

### 5. Deployment
- Enable all security headers in production
- Use HTTPS only
- Keep SESSION_SECRET secure (use environment management)
- Monitor audit logs regularly
- Enable database encryption

## Monitoring & Maintenance

### Audit Log Queries
```typescript
// Recent activity by user
const userActivity = await getAuditLogs({
  userId: 'user-id',
  limit: 100,
})

// All changes to specific entity
const entityHistory = await getAuditLogs({
  entity: 'Invoice',
  limit: 200,
})

// Delete operations in specific company
const deletes = await getAuditLogs({
  companyId: 'company-id',
  action: 'DELETE',
  limit: 50,
})
```

### Health Checks
The `/api/ai/health` endpoint is whitelisted for monitoring. Consider implementing:
- Database connection checks
- External service health status
- Application version info

## Troubleshooting

### Session Redirect Loop
- Check SESSION_SECRET is set correctly
- Verify session cookie is being sent with requests
- Check middleware.ts public paths include your route

### Password Validation Failing
- Ensure all 5 requirements are met (length, upper, lower, number, special)
- Use `validatePassword()` to get specific error messages
- Special character requirements can be found in password-policy.ts

### Audit Logs Not Recording
- Check if AuditLog model exists in Prisma schema (optional)
- Audit logging failures won't crash the app (graceful degradation)
- Check server logs for "Audit log error" messages

## Next Steps

1. Update all API routes to use pagination utilities
2. Add password validation to user creation/update endpoints
3. Integrate audit logging in critical operations
4. Configure environment variables for production
5. Set up monitoring for audit log changes
6. Implement role-based access control (RBAC) if not present
