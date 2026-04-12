# 🧪 Testing Guide - Better-Auth

## Manual Testing Checklist

### 1. Registro de Usuário

- [ ] Acessar `/auth/register`
- [ ] Preencher formulário com dados válidos
- [ ] Verificar validação de senha (8+ chars, maiúscula, minúscula, número, especial)
- [ ] Verificar que senhas coincidem
- [ ] Submeter formulário
- [ ] Verificar redirecionamento para verificação de email
- [ ] Verificar que usuário foi criado no banco de dados

**SQL para verificar:**
```sql
SELECT id, name, email, username, role, is_active 
FROM users 
WHERE email = 'test@example.com';
```

### 2. Login com Email/Senha

- [ ] Acessar `/auth/login`
- [ ] Inserir credenciais válidas
- [ ] Verificar redirecionamento para dashboard
- [ ] Verificar que sessão foi criada
- [ ] Verificar cookie de sessão no navegador

**SQL para verificar:**
```sql
SELECT s.id, s.user_id, s.expires_at, s.ip_address, s.user_agent
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE u.email = 'test@example.com'
ORDER BY s.created_at DESC
LIMIT 1;
```

### 3. Proteção de Rotas

- [ ] Tentar acessar `/dashboard` sem login
- [ ] Verificar redirecionamento para `/auth/login`
- [ ] Fazer login
- [ ] Verificar acesso permitido ao dashboard
- [ ] Tentar acessar `/admin` com usuário não-admin
- [ ] Verificar redirecionamento para `/unauthorized`

### 4. RBAC (Role-Based Access Control)

**Teste com usuário USER:**
- [ ] Login como USER
- [ ] Tentar acessar `/admin` → Deve ser bloqueado
- [ ] Tentar acessar `/settings/users` → Deve ser bloqueado
- [ ] Acessar `/dashboard` → Deve funcionar

**Teste com usuário ADMIN:**
- [ ] Login como ADMIN
- [ ] Acessar `/admin` → Deve funcionar
- [ ] Acessar `/settings/users` → Deve funcionar
- [ ] Verificar todas as permissões disponíveis

**SQL para criar usuário admin:**
```sql
UPDATE users 
SET role = 'ADMIN',
    can_delete = true,
    can_approve = true,
    can_manage_financial = true,
    can_manage_users = true,
    can_manage_projects = true,
    can_manage_contracts = true,
    can_view_reports = true,
    can_export_data = true,
    can_manage_settings = true
WHERE email = 'admin@example.com';
```

### 5. MFA/2FA Setup

- [ ] Login como usuário
- [ ] Acessar `/settings/security`
- [ ] Clicar em "Configurar 2FA"
- [ ] Escanear QR Code com Google Authenticator
- [ ] Copiar códigos de backup
- [ ] Inserir código de verificação
- [ ] Verificar que 2FA foi ativado

**SQL para verificar:**
```sql
SELECT tf.id, tf.user_id, tf.is_enabled, u.email
FROM two_factors tf
JOIN users u ON tf.user_id = u.id
WHERE u.email = 'test@example.com';
```

### 6. Login com 2FA

- [ ] Fazer logout
- [ ] Fazer login com email/senha
- [ ] Verificar redirecionamento para `/auth/verify-2fa`
- [ ] Inserir código do autenticador
- [ ] Verificar login bem-sucedido

### 7. Passkeys/WebAuthn

- [ ] Acessar `/auth/login`
- [ ] Clicar em "Login com Passkey"
- [ ] Seguir prompt do navegador para criar passkey
- [ ] Verificar login bem-sucedido
- [ ] Fazer logout
- [ ] Fazer login novamente com passkey

**SQL para verificar:**
```sql
SELECT p.id, p.user_id, p.name, p.device_type, u.email
FROM passkeys p
JOIN users u ON p.user_id = u.id
WHERE u.email = 'test@example.com';
```

### 8. Múltiplas Sessões

- [ ] Fazer login no Chrome
- [ ] Fazer login no Firefox (mesmo usuário)
- [ ] Verificar que ambas as sessões estão ativas
- [ ] Acessar configurações de sessões
- [ ] Invalidar uma sessão
- [ ] Verificar que sessão foi encerrada

**SQL para verificar:**
```sql
SELECT s.id, s.ip_address, s.user_agent, s.created_at
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE u.email = 'test@example.com'
ORDER BY s.created_at DESC;
```

### 9. Audit Logs

- [ ] Fazer login
- [ ] Criar um projeto
- [ ] Editar um projeto
- [ ] Deletar um projeto
- [ ] Verificar logs de auditoria

**SQL para verificar:**
```sql
SELECT al.action, al.resource, al.resource_id, al.ip_address, al.created_at, u.email
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
ORDER BY al.created_at DESC
LIMIT 20;
```

### 10. Rate Limiting

- [ ] Tentar fazer login com senha errada 10 vezes
- [ ] Verificar bloqueio após 10 tentativas
- [ ] Aguardar 15 minutos
- [ ] Verificar que pode tentar novamente

### 11. Logout

- [ ] Fazer login
- [ ] Clicar em "Sair"
- [ ] Verificar redirecionamento para login
- [ ] Verificar que sessão foi invalidada
- [ ] Tentar acessar página protegida
- [ ] Verificar redirecionamento para login

---

## Automated Testing

### Unit Tests

```typescript
// __tests__/auth/server.test.ts
import { describe, it, expect } from 'vitest';
import { hasRole, hasPermission, hasMinimumRole } from '@/lib/auth/server';

describe('Auth Server Utils', () => {
  it('should check role correctly', async () => {
    const session = {
      user: { role: 'ADMIN' }
    };
    
    expect(await hasRole('ADMIN')).toBe(true);
    expect(await hasRole('USER')).toBe(false);
  });

  it('should check permission correctly', async () => {
    const session = {
      user: { canDelete: true, canApprove: false }
    };
    
    expect(await hasPermission('canDelete')).toBe(true);
    expect(await hasPermission('canApprove')).toBe(false);
  });

  it('should check minimum role correctly', async () => {
    const session = {
      user: { role: 'MANAGER' }
    };
    
    expect(await hasMinimumRole('USER')).toBe(true);
    expect(await hasMinimumRole('MANAGER')).toBe(true);
    expect(await hasMinimumRole('ADMIN')).toBe(false);
  });
});
```

### Integration Tests

```typescript
// __tests__/auth/integration.test.ts
import { describe, it, expect } from 'vitest';
import { authClient } from '@/lib/auth/client';

describe('Auth Integration', () => {
  it('should register new user', async () => {
    const result = await authClient.signUp.email({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Test123!@#',
      username: 'testuser',
      role: 'USER',
    });
    
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
  });

  it('should login with valid credentials', async () => {
    const result = await authClient.signIn.email({
      email: 'test@example.com',
      password: 'Test123!@#',
    });
    
    expect(result.error).toBeUndefined();
    expect(result.data?.session).toBeDefined();
  });

  it('should fail login with invalid credentials', async () => {
    const result = await authClient.signIn.email({
      email: 'test@example.com',
      password: 'wrongpassword',
    });
    
    expect(result.error).toBeDefined();
  });
});
```

### E2E Tests (Playwright)

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should register and login', async ({ page }) => {
    // Register
    await page.goto('/auth/register');
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.fill('input[name="confirmPassword"]', 'Test123!@#');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/auth/verify-email');
    
    // Login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/dashboard');
  });

  test('should protect admin routes', async ({ page }) => {
    // Login as regular user
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');
    
    // Try to access admin route
    await page.goto('/admin');
    
    await expect(page).toHaveURL('/unauthorized');
  });
});
```

---

## Performance Testing

### Load Test (k6)

```javascript
// load-test/auth.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  const payload = JSON.stringify({
    email: 'test@example.com',
    password: 'Test123!@#',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post('http://localhost:3000/api/auth/sign-in/email', payload, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

---

## Security Testing

### 1. SQL Injection
- [ ] Tentar injetar SQL no campo de email
- [ ] Tentar injetar SQL no campo de senha
- [ ] Verificar que inputs são sanitizados

### 2. XSS (Cross-Site Scripting)
- [ ] Tentar inserir `<script>alert('XSS')</script>` no nome
- [ ] Verificar que HTML é escapado

### 3. CSRF (Cross-Site Request Forgery)
- [ ] Verificar que tokens CSRF estão presentes
- [ ] Tentar fazer requisição sem token
- [ ] Verificar que requisição é bloqueada

### 4. Brute Force
- [ ] Verificar rate limiting após múltiplas tentativas
- [ ] Verificar que IP é bloqueado temporariamente

### 5. Session Hijacking
- [ ] Verificar que cookies têm flag `httpOnly`
- [ ] Verificar que cookies têm flag `secure` em produção
- [ ] Verificar que cookies têm flag `sameSite`

---

## Monitoring

### Metrics to Track

1. **Authentication Success Rate**
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE action = 'auth.login.success') as success,
     COUNT(*) FILTER (WHERE action = 'auth.login.failed') as failed
   FROM audit_logs
   WHERE created_at > NOW() - INTERVAL '24 hours';
   ```

2. **Active Sessions**
   ```sql
   SELECT COUNT(*) as active_sessions
   FROM sessions
   WHERE expires_at > NOW();
   ```

3. **2FA Adoption Rate**
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE is_enabled = true) as enabled,
     COUNT(*) as total,
     ROUND(COUNT(*) FILTER (WHERE is_enabled = true)::numeric / COUNT(*) * 100, 2) as percentage
   FROM two_factors;
   ```

4. **Failed Login Attempts**
   ```sql
   SELECT ip_address, COUNT(*) as attempts
   FROM audit_logs
   WHERE action = 'auth.login.failed'
     AND created_at > NOW() - INTERVAL '1 hour'
   GROUP BY ip_address
   HAVING COUNT(*) > 5
   ORDER BY attempts DESC;
   ```

---

## Troubleshooting Tests

### Test Fails: "Session not found"
```bash
# Clear cookies
# Check DATABASE_URL
# Verify tables exist
psql $DATABASE_URL -c "\dt"
```

### Test Fails: "Rate limit exceeded"
```bash
# Wait 15 minutes or clear Redis
redis-cli FLUSHALL
```

### Test Fails: "Invalid credentials"
```bash
# Verify user exists
psql $DATABASE_URL -c "SELECT * FROM users WHERE email = 'test@example.com';"

# Reset password
psql $DATABASE_URL -c "UPDATE users SET password = '...' WHERE email = 'test@example.com';"
```

---

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run migrations
        run: psql $DATABASE_URL -f drizzle/migrations/add_better_auth_tables.sql
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      
      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          BETTER_AUTH_SECRET: test-secret
```

---

## Test Coverage Goals

- [ ] Unit Tests: > 80%
- [ ] Integration Tests: > 70%
- [ ] E2E Tests: Critical paths covered
- [ ] Security Tests: All OWASP Top 10 covered
- [ ] Performance Tests: < 500ms response time
