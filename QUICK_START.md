# 🚀 Quick Start - Better-Auth

## Instalação Rápida

### 1. Instalar Dependências (Já feito ✅)

```bash
npm install argon2 @simplewebauthn/server @simplewebauthn/browser
```

### 2. Configurar Variáveis de Ambiente

```bash
# Copiar exemplo
cp .env.better-auth.example .env.local

# Gerar secret
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" >> .env.local
```

### 3. Executar Migration

```bash
# Opção 1: Usando psql
psql $DATABASE_URL -f drizzle/migrations/add_better_auth_tables.sql

# Opção 2: Usando Drizzle Kit
npx drizzle-kit push:pg
```

### 4. Testar

```bash
npm run dev
```

Acesse: http://localhost:3000/auth/login

---

## Exemplos Rápidos

### Login Simples

```tsx
// app/auth/login/page.tsx
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return <LoginForm />;
}
```

### Página Protegida

```tsx
// app/dashboard/page.tsx
import { requireAuth } from "@/lib/auth/server";

export default async function Dashboard() {
  const session = await requireAuth();
  return <h1>Olá, {session.user.name}!</h1>;
}
```

### Verificar Role

```tsx
// app/admin/page.tsx
import { requireRole } from "@/lib/auth/server";

export default async function AdminPage() {
  await requireRole("ADMIN");
  return <h1>Admin Panel</h1>;
}
```

### Componente com Permissão

```tsx
"use client";
import { RoleGate } from "@/components/auth/role-gate";

export function DeleteButton() {
  return (
    <RoleGate permission="canDelete">
      <button>Deletar</button>
    </RoleGate>
  );
}
```

### Logout

```tsx
"use client";
import { signOut } from "@/lib/auth/client";

export function LogoutButton() {
  return (
    <button onClick={() => signOut()}>
      Sair
    </button>
  );
}
```

---

## Estrutura de Arquivos

```
src/
├── lib/
│   └── auth/
│       ├── config.ts      # Configuração principal
│       ├── client.ts      # Hooks e helpers client-side
│       └── server.ts      # Funções server-side
├── app/
│   └── api/
│       └── auth/
│           └── [...all]/
│               └── route.ts  # API handler
└── components/
    └── auth/
        ├── login-form.tsx
        ├── register-form.tsx
        ├── mfa-setup.tsx
        ├── protected-route.tsx
        ├── role-gate.tsx
        └── user-menu.tsx
```

---

## Rotas Disponíveis

### API Routes (Better-Auth)
- `POST /api/auth/sign-in/email` - Login
- `POST /api/auth/sign-up/email` - Registro
- `POST /api/auth/sign-out` - Logout
- `GET /api/auth/session` - Obter sessão
- `POST /api/auth/two-factor/enable` - Ativar 2FA
- `POST /api/auth/two-factor/verify` - Verificar 2FA
- `POST /api/auth/passkey/register` - Registrar passkey
- `POST /api/auth/passkey/authenticate` - Login com passkey

### UI Routes (Criar conforme necessário)
- `/auth/login` - Página de login
- `/auth/register` - Página de registro
- `/auth/verify-email` - Verificação de email
- `/auth/verify-2fa` - Verificação 2FA
- `/auth/forgot-password` - Esqueci a senha
- `/settings/security` - Configurações de segurança

---

## Variáveis de Ambiente Mínimas

```env
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."
```

---

## Comandos Úteis

```bash
# Gerar migration
npx drizzle-kit generate:pg

# Push schema para DB
npx drizzle-kit push:pg

# Abrir Drizzle Studio
npx drizzle-kit studio

# Verificar tipos
npm run typecheck

# Rodar testes
npm test
```

---

## Próximos Passos

1. ✅ Criar páginas de autenticação em `/app/auth/`
2. ✅ Configurar envio de emails
3. ✅ Testar fluxo completo de registro
4. ✅ Configurar 2FA
5. ✅ Testar passkeys
6. ✅ Adicionar testes automatizados

---

## Suporte

- 📖 Documentação completa: `BETTER_AUTH_SETUP.md`
- 🐛 Issues: Verifique logs em `console` e `audit_logs` table
- 💬 Dúvidas: Consulte [Better-Auth Docs](https://better-auth.com)
