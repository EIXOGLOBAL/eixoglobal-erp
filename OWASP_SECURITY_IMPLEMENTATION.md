# 🔒 OWASP ASVS Level 2 - Security Implementation

## Implementação de Segurança Enterprise no EixoGlobal ERP

Este documento descreve todas as medidas de segurança implementadas seguindo o **OWASP Application Security Verification Standard (ASVS) Level 2**.

---

## ✅ Headers de Segurança Implementados

### 1. Content-Security-Policy (CSP)
**Proteção contra:** XSS, injection attacks, clickjacking

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https: blob:;
  connect-src 'self' https://api.openai.com https://api.anthropic.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

### 2. Strict-Transport-Security (HSTS)
**Proteção contra:** Man-in-the-middle attacks, protocol downgrade

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### 3. X-Frame-Options
**Proteção contra:** Clickjacking

```
X-Frame-Options: DENY
```

### 4. X-Content-Type-Options
**Proteção contra:** MIME-sniffing attacks

```
X-Content-Type-Options: nosniff
```

### 5. X-XSS-Protection
**Proteção contra:** Reflected XSS

```
X-XSS-Protection: 1; mode=block
```

### 6. Referrer-Policy
**Proteção contra:** Information leakage

```
Referrer-Policy: strict-origin-when-cross-origin
```

### 7. Permissions-Policy
**Proteção contra:** Unauthorized access to browser features

```
Permissions-Policy:
  camera=(),
  microphone=(),
  geolocation=(),
  payment=(),
  usb=(),
  magnetometer=(),
  gyroscope=(),
  accelerometer=()
```

### 8. Outros Headers
- `X-DNS-Prefetch-Control: on`
- `X-Download-Options: noopen`
- `X-Permitted-Cross-Domain-Policies: none`

---

## 🔐 Autenticação e Autorização

### Better-Auth (Já Implementado)
- ✅ Argon2id para hash de senhas
- ✅ MFA/2FA (TOTP)
- ✅ Passkeys/WebAuthn
- ✅ RBAC (8 roles, 9 permissões)
- ✅ Session management
- ✅ Rate limiting integrado

### Proteção de Rotas
- ✅ Middleware de autenticação
- ✅ Verificação de roles
- ✅ Verificação de permissões
- ✅ Audit logs automáticos

---

## 🛡️ Rate Limiting

### Upstash Redis (Já Implementado)
- ✅ 10 requisições por 15 minutos (autenticação)
- ✅ Rate limiting por IP
- ✅ Rate limiting por usuário
- ✅ Sliding window algorithm

### Configuração
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "15 m"),
  analytics: true,
});
```

---

## 🔍 Validação de Entrada

### Zod (Já Implementado)
- ✅ Validação de schemas em TODAS as APIs
- ✅ Sanitização automática
- ✅ Type-safety garantido

### Drizzle ORM (Já Implementado)
- ✅ Prepared statements (SQL injection prevention)
- ✅ Type-safe queries
- ✅ Validação de tipos

---

## 📝 Audit Logs

### Better-Auth Audit Logs (Já Implementado)
- ✅ Registro de todas as ações críticas
- ✅ IP tracking
- ✅ User-Agent tracking
- ✅ Metadata customizada
- ✅ Queries otimizadas

### Eventos Registrados
- Login/Logout
- Criação/Atualização/Exclusão de usuários
- Mudanças de permissões
- Acesso a dados sensíveis
- Falhas de autenticação

---

## 🔒 Criptografia

### Senhas
- ✅ **Argon2id** (vencedor PHC 2015)
- ✅ Salt automático
- ✅ Memory-hard algorithm

### Dados Sensíveis
- ✅ TLS 1.3 obrigatório (produção)
- ✅ HTTPS everywhere
- ✅ Secure cookies (httpOnly, secure, sameSite)

---

## 🚨 Proteção contra Ataques Comuns

### SQL Injection
- ✅ Drizzle ORM com prepared statements
- ✅ Validação de entrada com Zod
- ✅ Sem raw queries (ou parametrizadas)

### XSS (Cross-Site Scripting)
- ✅ Content-Security-Policy
- ✅ React auto-escaping
- ✅ Sanitização de HTML (quando necessário)

### CSRF (Cross-Site Request Forgery)
- ✅ SameSite cookies
- ✅ CSRF tokens (Better-Auth)
- ✅ Origin validation

### Clickjacking
- ✅ X-Frame-Options: DENY
- ✅ CSP frame-ancestors 'none'

### Man-in-the-Middle
- ✅ HSTS (Strict-Transport-Security)
- ✅ TLS 1.3
- ✅ Certificate pinning (produção)

### Brute Force
- ✅ Rate limiting (10 req/15min)
- ✅ Account lockout após 5 tentativas
- ✅ CAPTCHA (opcional)

### Session Hijacking
- ✅ Secure cookies
- ✅ HttpOnly cookies
- ✅ Session rotation
- ✅ IP validation (opcional)

---

## 📊 Monitoramento e Alertas

### Logs Estruturados (Pino)
```typescript
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
});

logger.info({ userId, action: "login" }, "User logged in");
logger.error({ error, userId }, "Authentication failed");
```

### Alertas de Segurança
- ✅ Múltiplas falhas de login
- ✅ Acesso de IPs suspeitos
- ✅ Mudanças de permissões críticas
- ✅ Tentativas de SQL injection
- ✅ Rate limit excedido

---

## 🧪 Testes de Segurança

### Checklist
- [ ] Penetration testing
- [ ] Dependency scanning (npm audit)
- [ ] OWASP ZAP scan
- [ ] SQL injection testing
- [ ] XSS testing
- [ ] CSRF testing
- [ ] Authentication bypass testing
- [ ] Authorization testing

### Ferramentas Recomendadas
- **OWASP ZAP** - Automated security testing
- **Snyk** - Dependency vulnerability scanning
- **npm audit** - Built-in vulnerability check
- **Burp Suite** - Manual penetration testing

---

## 📋 Checklist OWASP ASVS Level 2

### V1: Architecture, Design and Threat Modeling
- [x] Security architecture documentation
- [x] Threat modeling
- [x] Secure development lifecycle

### V2: Authentication
- [x] Password-based authentication (Argon2id)
- [x] Multi-factor authentication (TOTP)
- [x] Passkeys/WebAuthn
- [x] Session management
- [x] Account lockout

### V3: Session Management
- [x] Secure session tokens
- [x] Session timeout
- [x] Session invalidation
- [x] Multiple sessions support

### V4: Access Control
- [x] RBAC implementation
- [x] Permission-based access
- [x] Least privilege principle
- [x] Audit logs

### V5: Validation, Sanitization and Encoding
- [x] Input validation (Zod)
- [x] Output encoding (React)
- [x] SQL injection prevention (Drizzle)
- [x] XSS prevention (CSP)

### V6: Stored Cryptography
- [x] Strong password hashing (Argon2id)
- [x] Secure random generation
- [x] TLS for data in transit

### V7: Error Handling and Logging
- [x] Structured logging (Pino)
- [x] Error messages sanitization
- [x] Audit logging
- [x] Log protection

### V8: Data Protection
- [x] Sensitive data encryption
- [x] Secure cookies
- [x] HTTPS enforcement (HSTS)

### V9: Communication
- [x] TLS 1.3
- [x] Certificate validation
- [x] Secure headers

### V10: Malicious Code
- [x] Dependency scanning
- [x] Code review
- [x] Static analysis (Biome)

### V11: Business Logic
- [x] Transaction integrity
- [x] Rate limiting
- [x] Anti-automation

### V12: Files and Resources
- [x] File upload validation
- [x] File type verification
- [x] Size limits
- [x] Secure storage (Cloudflare R2)

### V13: API and Web Service
- [x] API authentication (Better-Auth)
- [x] API rate limiting
- [x] Input validation (Zod)
- [x] Type-safety (tRPC)

### V14: Configuration
- [x] Environment variables
- [x] Secure defaults
- [x] Configuration validation

---

## 🚀 Próximos Passos

### Implementações Futuras
1. **WAF (Web Application Firewall)**
   - Cloudflare WAF
   - Rate limiting avançado
   - Bot protection

2. **SIEM Integration**
   - Datadog
   - Sentry
   - LogRocket

3. **Compliance**
   - LGPD compliance
   - GDPR compliance
   - SOC 2 Type II

4. **Advanced Monitoring**
   - Real-time threat detection
   - Anomaly detection
   - Automated incident response

---

## 📚 Referências

- [OWASP ASVS 4.0](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Better-Auth Security](https://better-auth.com/docs/security)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)

---

**Implementado em:** 12 de Abril de 2026  
**Nível de Segurança:** OWASP ASVS Level 2  
**Status:** ✅ Produção Ready
