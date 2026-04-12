# Better-Auth Enterprise Setup - EixoGlobal ERP

## 📋 Resumo da Implementação

Sistema de autenticação enterprise completo implementado com Better-Auth, incluindo:

- ✅ Autenticação com email/senha (Argon2)
- ✅ MFA/2FA (TOTP)
- ✅ Passkeys/WebAuthn
- ✅ RBAC (Role-Based Access Control)
- ✅ Organizations (Multi-tenant)
- ✅ Session Management
- ✅ Rate Limiting
- ✅ Audit Logs
- ✅ Middleware de proteção de rotas

---

## 📁 Arquivos Criados

### Configuração Principal
- `/workspace/eixoglobal-erp/src/lib/auth/config.ts` - Configuração do Better-Auth
- `/workspace/eixoglobal-erp/src/lib/auth/client.ts` - Utilitários client-side
- `/workspace/eixoglobal-erp/src/lib/auth/server.ts` - Utilitários server-side

### API Routes
- `/workspace/eixoglobal-erp/src/app/api/auth/[...all]/route.ts` - Handler de autenticação

### Componentes
- `/workspace/eixoglobal-erp/src/components/auth/login-form.tsx` - Formulário de login
- `/workspace/eixoglobal-erp/src/components/auth/register-form.tsx` - Formulário de registro
- `/workspace/eixoglobal-erp/src/components/auth/mfa-setup.tsx` - Configuração de 2FA
- `/workspace/eixoglobal-erp/src/components/auth/protected-route.tsx` - Componente de proteção
- `/workspace/eixoglobal-erp/src/components/auth/role-gate.tsx` - Gate de permissões
- `/workspace/eixoglobal-erp/src/components/auth/user-menu.tsx` - Menu do usuário

### Middleware
- `/workspace/eixoglobal-erp/middleware.ts` - Middleware de proteção de rotas

### Database
- `/workspace/eixoglobal-erp/src/lib/db/schema.ts` - Schema atualizado com tabelas Better-Auth
- `/workspace/eixoglobal-erp/drizzle/migrations/add_better_auth_tables.sql` - Migration SQL

### Configuração
- `/workspace/eixoglobal-erp/.env.better-auth.example` - Variáveis de ambiente

---

## 🚀 Como Usar

### 1. Configurar Variáveis de Ambiente

Copie o arquivo `.env.better-auth.example` para `.env.local`:

```bash
cp .env.better-auth.example .env.local
```

Edite `.env.local` e configure:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/eixoglobal_erp"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
UPSTASH_REDIS_REST_URL="your-upstash-redis-url"
UPSTASH_REDIS_REST_TOKEN="your-upstash-redis-token"
```

### 2. Executar Migration

Execute a migration para criar as tabelas do Better-Auth:

```bash
# Usando psql
psql $DATABASE_URL -f drizzle/migrations/add_better_auth_tables.sql

# Ou usando Drizzle Kit
npx drizzle-kit push:pg
```

### 3. Usar nos Componentes

#### Login Page

```tsx
// app/auth/login/page.tsx
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="container max-w-md mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Login</h1>
      <LoginForm redirectTo="/dashboard" />
    </div>
  );
}
```

#### Register Page

```tsx
// app/auth/register/page.tsx
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="container max-w-md mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Criar Conta</h1>
      <RegisterForm redirectTo="/dashboard" />
    </div>
  );
}
```

#### Protected Page (Server Component)

```tsx
// app/dashboard/page.tsx
import { requireAuth, getCurrentUser } from "@/lib/auth/server";

export default async function DashboardPage() {
  const session = await requireAuth();
  const user = await getCurrentUser();

  return (
    <div>
      <h1>Bem-vindo, {user?.name}!</h1>
      <p>Role: {user?.role}</p>
    </div>
  );
}
```

#### Protected Page (Client Component)

```tsx
// app/dashboard/client-page.tsx
"use client";

import { useSession } from "@/lib/auth/client";
import { ProtectedRoute } from "@/components/auth/protected-route";

export default function ClientDashboard() {
  const { data: session } = useSession();

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div>
        <h1>Admin Dashboard</h1>
        <p>Usuário: {session?.user?.name}</p>
      </div>
    </ProtectedRoute>
  );
}
```

#### Role-Based UI

```tsx
"use client";

import { RoleGate } from "@/components/auth/role-gate";

export function AdminPanel() {
  return (
    <RoleGate role="ADMIN" fallback={<p>Acesso negado</p>}>
      <div>
        <h2>Painel Administrativo</h2>
        {/* Conteúdo apenas para admins */}
      </div>
    </RoleGate>
  );
}
```

#### Permission-Based UI

```tsx
"use client";

import { RoleGate } from "@/components/auth/role-gate";

export function DeleteButton() {
  return (
    <RoleGate permission="canDelete" fallback={null}>
      <button>Deletar</button>
    </RoleGate>
  );
}
```

### 4. Proteção de Rotas Server-Side

```tsx
// app/admin/users/page.tsx
import { requireRole, requirePermission } from "@/lib/auth/server";

export default async function AdminUsersPage() {
  // Requer role ADMIN
  await requireRole("ADMIN");
  
  // Ou requer permissão específica
  await requirePermission("canManageUsers");

  return <div>Gerenciar Usuários</div>;
}
```

### 5. Audit Logs

```tsx
// app/api/projects/route.ts
import { createAuditLog } from "@/lib/auth/server";

export async function POST(request: Request) {
  const data = await request.json();
  
  // Criar projeto...
  const project = await createProject(data);
  
  // Registrar no audit log
  await createAuditLog({
    action: "project.create",
    resource: "project",
    resourceId: project.id,
    metadata: { name: project.name },
  });
  
  return Response.json(project);
}
```

### 6. MFA Setup

```tsx
// app/settings/security/page.tsx
import { MFASetup } from "@/components/auth/mfa-setup";

export default function SecurityPage() {
  return (
    <div className="container max-w-2xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Segurança</h1>
      <MFASetup onComplete={() => console.log("2FA ativado!")} />
    </div>
  );
}
```

### 7. User Menu

```tsx
// components/layout/header.tsx
import { UserMenu } from "@/components/auth/user-menu";

export function Header() {
  return (
    <header className="border-b">
      <div className="container flex items-center justify-between py-4">
        <h1>EixoGlobal ERP</h1>
        <UserMenu />
      </div>
    </header>
  );
}
```

---

## 🔐 Roles e Permissões

### Roles Disponíveis

```typescript
type Role = 
  | "ADMIN"           // Acesso total
  | "MANAGER"         // Gerenciamento de projetos e equipes
  | "SUPERVISOR"      // Supervisão de obras
  | "ENGINEER"        // Engenheiro
  | "ACCOUNTANT"      // Contador
  | "HR_ANALYST"      // Analista de RH
  | "SAFETY_OFFICER"  // Técnico de Segurança
  | "USER";           // Usuário padrão
```

### Permissões Disponíveis

```typescript
interface UserPermissions {
  canDelete: boolean;
  canApprove: boolean;
  canManageFinancial: boolean;
  canManageUsers: boolean;
  canManageProjects: boolean;
  canManageContracts: boolean;
  canViewReports: boolean;
  canExportData: boolean;
  canManageSettings: boolean;
}
```

### Hierarquia de Roles

```typescript
ADMIN (100)
  ↓
MANAGER (80)
  ↓
SUPERVISOR (60)
  ↓
ENGINEER (50)
  ↓
ACCOUNTANT / HR_ANALYST (40)
  ↓
SAFETY_OFFICER (30)
  ↓
USER (10)
```

---

## 🛡️ Proteção de Rotas no Middleware

O middleware protege automaticamente as seguintes rotas:

```typescript
// Rotas protegidas por role
/admin/*              → ADMIN
/settings/users/*     → ADMIN, MANAGER
/settings/company/*   → ADMIN, MANAGER
/financial/*          → ADMIN, MANAGER, ACCOUNTANT
/reports/*            → ADMIN, MANAGER, ACCOUNTANT, ENGINEER
/projects/create      → ADMIN, MANAGER, ENGINEER
/contracts/create     → ADMIN, MANAGER
/employees/*          → ADMIN, MANAGER, HR_ANALYST

// Rotas protegidas por permissão
/delete/*             → canDelete
/approve/*            → canApprove
/financial/manage/*   → canManageFinancial
/users/manage/*       → canManageUsers
/projects/manage/*    → canManageProjects
/contracts/manage/*   → canManageContracts
/settings/*           → canManageSettings
```

---

## 📊 Funcionalidades Implementadas

### 1. Autenticação com Email/Senha
- Hash de senha com Argon2id
- Verificação de email
- Reset de senha
- Lembrar-me (sessão estendida)

### 2. MFA/2FA (TOTP)
- QR Code para configuração
- Códigos de backup
- Verificação em 6 dígitos
- Suporte a Google Authenticator, Authy, etc.

### 3. Passkeys/WebAuthn
- Login sem senha
- Suporte a biometria
- Múltiplos passkeys por usuário
- Fallback para senha

### 4. RBAC
- 8 roles predefinidas
- 9 permissões granulares
- Hierarquia de roles
- Proteção em middleware e componentes

### 5. Organizations (Multi-tenant)
- Múltiplas organizações por usuário
- Convites para organizações
- Roles dentro de organizações
- Isolamento de dados

### 6. Session Management
- Múltiplas sessões simultâneas (máx. 5)
- Invalidação de sessões
- Tracking de IP e User-Agent
- Expiração configurável

### 7. Rate Limiting
- 10 requisições por 15 minutos
- Proteção contra brute force
- Integração com Upstash Redis

### 8. Audit Logs
- Registro de todas as ações
- IP e User-Agent
- Metadata customizável
- Índices para consultas rápidas

---

## 🔧 Customização

### Adicionar Nova Permissão

1. Adicione a coluna no schema:
```typescript
// src/lib/db/schema.ts
export const users = pgTable('users', {
  // ...
  canCustomAction: boolean('can_custom_action').default(false).notNull(),
});
```

2. Atualize os helpers:
```typescript
// src/lib/auth/client.ts
export function hasPermission(session: any, permission: string): boolean {
  const permissions: Record<string, boolean> = {
    // ...
    canCustomAction: session.user.canCustomAction,
  };
  return permissions[permission] || false;
}
```

3. Use no middleware:
```typescript
// middleware.ts
const permissionProtectedRoutes: Record<string, string> = {
  // ...
  '/custom-action': 'canCustomAction',
};
```

### Adicionar Nova Role

1. Atualize o enum:
```typescript
// src/lib/db/schema.ts
export const roleEnum = pgEnum('role', [
  // ...
  'NEW_ROLE',
]);
```

2. Atualize a hierarquia:
```typescript
// src/lib/auth/server.ts
const roleHierarchy: Record<string, number> = {
  // ...
  NEW_ROLE: 45,
};
```

3. Adicione proteção de rotas:
```typescript
// middleware.ts
const roleProtectedRoutes: Record<string, string[]> = {
  // ...
  '/new-route': ['ADMIN', 'NEW_ROLE'],
};
```

---

## 📝 Próximos Passos

1. **Configurar Email**: Implemente o envio de emails para verificação e reset de senha
2. **OAuth Providers**: Configure Google/GitHub OAuth se necessário
3. **Testes**: Adicione testes para autenticação e autorização
4. **Monitoramento**: Configure alertas para tentativas de login suspeitas
5. **Backup**: Configure backup dos códigos 2FA e passkeys

---

## 🐛 Troubleshooting

### Erro: "Session not found"
- Verifique se o cookie está sendo enviado
- Confirme que `NEXT_PUBLIC_APP_URL` está correto
- Limpe os cookies do navegador

### Erro: "Rate limit exceeded"
- Aguarde 15 minutos
- Verifique configuração do Upstash Redis
- Ajuste limites em `src/lib/auth/config.ts`

### Erro: "Invalid credentials"
- Verifique se a senha está correta
- Confirme que o usuário existe no banco
- Verifique logs de audit

### 2FA não funciona
- Sincronize o relógio do dispositivo
- Verifique se o QR Code foi escaneado corretamente
- Use códigos de backup se disponíveis

---

## 📚 Recursos

- [Better-Auth Docs](https://better-auth.com)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [Next.js Docs](https://nextjs.org/docs)
- [Argon2 Docs](https://github.com/ranisalt/node-argon2)
- [WebAuthn Guide](https://webauthn.guide)

---

## ✅ Checklist de Implementação

- [x] Instalar dependências
- [x] Configurar Better-Auth
- [x] Criar tabelas no banco
- [x] Implementar login/registro
- [x] Configurar MFA/2FA
- [x] Implementar Passkeys
- [x] Configurar RBAC
- [x] Implementar Organizations
- [x] Criar middleware de proteção
- [x] Adicionar audit logs
- [x] Criar componentes de UI
- [ ] Configurar envio de emails
- [ ] Adicionar testes
- [ ] Deploy em produção

---

**Implementado por**: Abacus AI  
**Data**: 12 de Abril de 2026  
**Versão**: 1.0.0
