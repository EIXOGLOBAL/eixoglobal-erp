# tRPC v11 - Configuração Completa no EixoGlobal ERP

## 📋 Resumo da Implementação

tRPC v11 foi configurado com sucesso no projeto EixoGlobal ERP, substituindo as APIs REST tradicionais por uma solução type-safe e moderna.

### ✅ Arquivos Criados

#### Configuração Base
- **`src/lib/trpc/server.ts`** - Configuração do servidor tRPC com contexto, middlewares e procedures
- **`src/lib/trpc/client.ts`** - Cliente tRPC vanilla (para uso fora do React)
- **`src/lib/trpc/react.tsx`** - Hooks React e Provider para TanStack Query + tRPC
- **`src/app/api/trpc/[trpc]/route.ts`** - Handler Next.js App Router

#### Routers
- **`src/lib/trpc/routers/_app.ts`** - Router raiz que combina todos os sub-routers
- **`src/lib/trpc/routers/users.ts`** - Operações de usuários
- **`src/lib/trpc/routers/projects.ts`** - Operações de projetos
- **`src/lib/trpc/routers/financial.ts`** - Operações financeiras

#### Modificações
- **`src/app/layout.tsx`** - Adicionado TRPCProvider

---

## 🚀 Como Usar

### 1. Em Componentes Client (React)

```tsx
'use client';

import { trpc } from '@/lib/trpc/react';

export function UsersList() {
  // Query - buscar dados
  const { data, isLoading, error } = trpc.users.list.useQuery({
    search: 'João',
    role: 'ENGINEER',
    limit: 20,
  });

  // Mutation - modificar dados
  const createUser = trpc.users.create.useMutation({
    onSuccess: () => {
      console.log('Usuário criado com sucesso!');
    },
  });

  const handleCreate = () => {
    createUser.mutate({
      username: 'joao.silva',
      email: 'joao@example.com',
      name: 'João Silva',
      password: 'senha123',
      role: 'ENGINEER',
    });
  };

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error.message}</div>;

  return (
    <div>
      <button onClick={handleCreate}>Criar Usuário</button>
      <ul>
        {data?.users.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 2. Em Server Components

```tsx
import { createCaller } from '@/lib/trpc/server';
import { createContext } from '@/lib/trpc/server';

export default async function ProjectsPage() {
  // Criar caller para server-side
  const ctx = await createContext();
  const caller = createCaller(ctx);

  // Buscar dados no servidor
  const projects = await caller.projects.list({
    status: 'IN_PROGRESS',
    limit: 10,
  });

  return (
    <div>
      <h1>Projetos em Andamento</h1>
      <ul>
        {projects.projects.map(project => (
          <li key={project.id}>{project.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 3. Em Server Actions

```tsx
'use server';

import { createCaller } from '@/lib/trpc/server';
import { createContext } from '@/lib/trpc/server';

export async function createProject(formData: FormData) {
  const ctx = await createContext();
  const caller = createCaller(ctx);

  const project = await caller.projects.create({
    name: formData.get('name') as string,
    startDate: new Date(formData.get('startDate') as string),
    status: 'PLANNING',
  });

  return project;
}
```

---

## 📚 Routers Disponíveis

### Users Router (`trpc.users.*`)

#### Queries
- **`me()`** - Retorna o usuário atual autenticado
- **`list({ search?, role?, isActive?, limit?, offset? })`** - Lista usuários (admin)
- **`getById({ id })`** - Busca usuário por ID
- **`stats()`** - Estatísticas de usuários (admin)

#### Mutations
- **`create({ username, email, name, password, role, ... })`** - Cria usuário (admin)
- **`update({ id, ... })`** - Atualiza usuário (admin)
- **`delete({ id })`** - Deleta usuário (admin)

### Projects Router (`trpc.projects.*`)

#### Queries
- **`list({ search?, status?, clientId?, engineerId?, ... })`** - Lista projetos
- **`getById({ id })`** - Busca projeto por ID
- **`stats()`** - Estatísticas de projetos
- **`byEngineer({ engineerId })`** - Projetos por engenheiro

#### Mutations
- **`create({ name, startDate, status, ... })`** - Cria projeto (manager)
- **`update({ id, ... })`** - Atualiza projeto (manager)
- **`delete({ id })`** - Deleta projeto (manager)

### Financial Router (`trpc.financial.*`)

#### Queries
- **`list({ type?, status?, projectId?, dateFrom?, dateTo?, ... })`** - Lista registros financeiros
- **`getById({ id })`** - Busca registro por ID
- **`stats({ dateFrom?, dateTo?, projectId? })`** - Estatísticas financeiras
- **`cashFlow({ dateFrom, dateTo, projectId? })`** - Fluxo de caixa
- **`bankAccounts()`** - Lista contas bancárias
- **`costCenters()`** - Lista centros de custo

#### Mutations
- **`create({ description, amount, type, ... })`** - Cria registro financeiro
- **`update({ id, ... })`** - Atualiza registro
- **`delete({ id })`** - Deleta registro

---

## 🔐 Autenticação e Permissões

### Tipos de Procedures

1. **`publicProcedure`** - Acesso público (sem autenticação)
2. **`protectedProcedure`** - Requer autenticação
3. **`adminProcedure`** - Requer role ADMIN
4. **`managerProcedure`** - Requer role ADMIN ou MANAGER
5. **`hasPermission(permission)`** - Requer permissão específica

### Exemplo de Uso

```typescript
// No router
export const myRouter = router({
  // Público
  public: publicProcedure.query(() => 'Hello World'),

  // Autenticado
  protected: protectedProcedure.query(({ ctx }) => ctx.user),

  // Admin apenas
  admin: adminProcedure.mutation(() => 'Admin action'),

  // Manager ou Admin
  manager: managerProcedure.mutation(() => 'Manager action'),

  // Permissão específica
  financial: protectedProcedure
    .use(hasPermission('canManageFinancial'))
    .mutation(() => 'Financial action'),
});
```

---

## 🔄 Migração de APIs REST para tRPC

### Antes (REST API)

```typescript
// app/api/users/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  
  const users = await db.query.users.findMany({
    where: search ? ilike(users.name, `%${search}%`) : undefined,
  });

  return Response.json(users);
}

// Componente
const response = await fetch('/api/users?search=João');
const users = await response.json();
```

### Depois (tRPC)

```typescript
// lib/trpc/routers/users.ts
export const usersRouter = router({
  list: protectedProcedure
    .input(z.object({ search: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.users.findMany({
        where: input.search ? ilike(users.name, `%${input.search}%`) : undefined,
      });
    }),
});

// Componente
const { data: users } = trpc.users.list.useQuery({ search: 'João' });
```

### Vantagens da Migração

✅ **Type Safety** - Erros de tipo detectados em tempo de desenvolvimento
✅ **Auto-complete** - IntelliSense completo em toda a aplicação
✅ **Validação** - Zod valida inputs automaticamente
✅ **Menos Código** - Não precisa definir tipos manualmente
✅ **Melhor DX** - Developer Experience muito superior
✅ **Cache Automático** - TanStack Query gerencia cache
✅ **Otimistic Updates** - Atualizações otimistas fáceis

---

## 📝 Exemplos Avançados

### 1. Invalidação de Cache

```tsx
'use client';

import { trpc } from '@/lib/trpc/react';

export function CreateProjectForm() {
  const utils = trpc.useUtils();

  const createProject = trpc.projects.create.useMutation({
    onSuccess: () => {
      // Invalida cache da lista de projetos
      utils.projects.list.invalidate();
      
      // Ou refetch específico
      utils.projects.stats.invalidate();
    },
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      createProject.mutate({
        name: 'Novo Projeto',
        startDate: new Date(),
        status: 'PLANNING',
      });
    }}>
      <button type="submit">Criar</button>
    </form>
  );
}
```

### 2. Optimistic Updates

```tsx
const updateProject = trpc.projects.update.useMutation({
  onMutate: async (newData) => {
    // Cancela queries em andamento
    await utils.projects.getById.cancel({ id: newData.id });

    // Snapshot do valor anterior
    const previousData = utils.projects.getById.getData({ id: newData.id });

    // Atualiza otimisticamente
    utils.projects.getById.setData({ id: newData.id }, (old) => ({
      ...old!,
      ...newData,
    }));

    return { previousData };
  },
  onError: (err, newData, context) => {
    // Reverte em caso de erro
    utils.projects.getById.setData(
      { id: newData.id },
      context?.previousData
    );
  },
  onSettled: (data, error, variables) => {
    // Refetch após sucesso ou erro
    utils.projects.getById.invalidate({ id: variables.id });
  },
});
```

### 3. Infinite Queries (Paginação)

```tsx
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
  trpc.projects.list.useInfiniteQuery(
    { limit: 20 },
    {
      getNextPageParam: (lastPage) =>
        lastPage.hasMore ? lastPage.offset + lastPage.limit : undefined,
    }
  );

return (
  <div>
    {data?.pages.map((page) =>
      page.projects.map((project) => (
        <div key={project.id}>{project.name}</div>
      ))
    )}
    {hasNextPage && (
      <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
        Carregar mais
      </button>
    )}
  </div>
);
```

### 4. Prefetch de Dados

```tsx
export default async function ProjectPage({ params }: { params: { id: string } }) {
  const ctx = await createContext();
  const caller = createCaller(ctx);

  // Prefetch no servidor
  const project = await caller.projects.getById({ id: params.id });

  return <ProjectDetails initialData={project} />;
}

function ProjectDetails({ initialData }: { initialData: any }) {
  // Usa dados prefetchados
  const { data } = trpc.projects.getById.useQuery(
    { id: initialData.id },
    { initialData }
  );

  return <div>{data.name}</div>;
}
```

---

## 🛠️ Adicionando Novos Routers

### 1. Criar o Router

```typescript
// src/lib/trpc/routers/clients.ts
import { router, protectedProcedure } from '../server';
import { z } from 'zod';
import { clients } from '@/lib/db/schema';

export const clientsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.clients.findMany();
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string(),
      email: z.string().email(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [client] = await ctx.db.insert(clients).values(input).returning();
      return client;
    }),
});
```

### 2. Adicionar ao App Router

```typescript
// src/lib/trpc/routers/_app.ts
import { clientsRouter } from './clients';

export const appRouter = router({
  users: usersRouter,
  projects: projectsRouter,
  financial: financialRouter,
  clients: clientsRouter, // ← Adicionar aqui
});
```

### 3. Usar no Componente

```tsx
const { data: clients } = trpc.clients.list.useQuery();
```

---

## 🎯 Próximos Passos

### Routers Sugeridos para Implementar

1. **Clients Router** - Gestão de clientes
2. **Suppliers Router** - Gestão de fornecedores
3. **Employees Router** - Gestão de funcionários
4. **Contracts Router** - Gestão de contratos
5. **Measurements Router** - Gestão de medições
6. **Tasks Router** - Gestão de tarefas
7. **Reports Router** - Geração de relatórios
8. **Dashboard Router** - Dados do dashboard

### Melhorias Futuras

- [ ] Implementar rate limiting por usuário
- [ ] Adicionar logging de todas as operações
- [ ] Criar testes automatizados para os routers
- [ ] Implementar subscriptions (WebSocket) para real-time
- [ ] Adicionar OpenAPI/Swagger para documentação
- [ ] Implementar batch mutations
- [ ] Adicionar métricas e monitoring

---

## 📖 Recursos

- [tRPC Documentation](https://trpc.io)
- [TanStack Query Documentation](https://tanstack.com/query)
- [Zod Documentation](https://zod.dev)
- [Drizzle ORM Documentation](https://orm.drizzle.team)

---

## 🐛 Troubleshooting

### Erro: "Cannot find module '@/lib/trpc/react'"

Certifique-se de que o TypeScript está configurado corretamente:

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Erro: "UNAUTHORIZED"

Verifique se o usuário está autenticado:

```tsx
const { data: user } = trpc.users.me.useQuery();
console.log('User:', user);
```

### Erro de Tipo no Router

Reinicie o TypeScript server:
- VS Code: `Cmd/Ctrl + Shift + P` → "TypeScript: Restart TS Server"

---

**Configuração concluída com sucesso! 🎉**

O tRPC v11 está pronto para uso no EixoGlobal ERP.
