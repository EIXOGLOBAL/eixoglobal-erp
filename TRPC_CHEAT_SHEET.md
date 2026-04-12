# tRPC v11 - Cheat Sheet

## 🚀 Quick Start

### Import
```tsx
import { trpc } from '@/lib/trpc/react';
```

---

## 📖 Queries (Buscar Dados)

### Básico
```tsx
const { data, isLoading, error } = trpc.users.list.useQuery();
```

### Com Parâmetros
```tsx
const { data } = trpc.users.list.useQuery({
  search: 'João',
  role: 'ENGINEER',
  limit: 20,
});
```

### Desabilitado Condicionalmente
```tsx
const { data } = trpc.users.getById.useQuery(
  { id: userId },
  { enabled: !!userId }
);
```

### Com Refetch
```tsx
const { data, refetch } = trpc.projects.list.useQuery();

// Refetch manualmente
refetch();
```

---

## ✏️ Mutations (Modificar Dados)

### Básico
```tsx
const createUser = trpc.users.create.useMutation();

createUser.mutate({
  username: 'joao',
  name: 'João Silva',
  password: 'senha123',
});
```

### Com Callbacks
```tsx
const createUser = trpc.users.create.useMutation({
  onSuccess: (data) => {
    console.log('Criado:', data);
  },
  onError: (error) => {
    console.error('Erro:', error.message);
  },
});
```

### Com Loading State
```tsx
const createUser = trpc.users.create.useMutation();

<button 
  onClick={() => createUser.mutate({ ... })}
  disabled={createUser.isPending}
>
  {createUser.isPending ? 'Criando...' : 'Criar'}
</button>
```

---

## 🔄 Invalidação de Cache

### Utils Hook
```tsx
const utils = trpc.useUtils();
```

### Invalidar Query
```tsx
// Invalida e refetch
utils.users.list.invalidate();

// Invalida query específica
utils.users.getById.invalidate({ id: userId });

// Invalida todas as queries de users
utils.users.invalidate();
```

### Após Mutation
```tsx
const createUser = trpc.users.create.useMutation({
  onSuccess: () => {
    utils.users.list.invalidate();
  },
});
```

---

## ⚡ Optimistic Updates

```tsx
const updateProject = trpc.projects.update.useMutation({
  onMutate: async (newData) => {
    // Cancela queries em andamento
    await utils.projects.getById.cancel({ id: newData.id });

    // Snapshot do valor anterior
    const previous = utils.projects.getById.getData({ id: newData.id });

    // Atualiza otimisticamente
    utils.projects.getById.setData({ id: newData.id }, (old) => ({
      ...old!,
      ...newData,
    }));

    return { previous };
  },
  onError: (err, newData, context) => {
    // Reverte em caso de erro
    utils.projects.getById.setData({ id: newData.id }, context?.previous);
  },
  onSettled: (data, error, variables) => {
    // Refetch após sucesso ou erro
    utils.projects.getById.invalidate({ id: variables.id });
  },
});
```

---

## 🔄 Infinite Queries (Paginação)

```tsx
const { 
  data, 
  fetchNextPage, 
  hasNextPage, 
  isFetchingNextPage 
} = trpc.projects.list.useInfiniteQuery(
  { limit: 20 },
  {
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.offset + lastPage.limit : undefined,
  }
);

// Renderizar
{data?.pages.map((page) =>
  page.projects.map((project) => (
    <div key={project.id}>{project.name}</div>
  ))
)}

// Botão carregar mais
{hasNextPage && (
  <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
    Carregar mais
  </button>
)}
```

---

## 🖥️ Server-Side (Server Components)

```tsx
import { createCaller } from '@/lib/trpc/server';
import { createContext } from '@/lib/trpc/server';

export default async function Page() {
  const ctx = await createContext();
  const caller = createCaller(ctx);
  
  const users = await caller.users.list({ limit: 10 });
  
  return <div>{/* render users */}</div>;
}
```

---

## 🎯 Prefetch

```tsx
export default async function Page() {
  const ctx = await createContext();
  const caller = createCaller(ctx);
  
  // Prefetch no servidor
  const project = await caller.projects.getById({ id: '123' });
  
  return <ProjectDetails initialData={project} />;
}

function ProjectDetails({ initialData }) {
  // Usa dados prefetchados
  const { data } = trpc.projects.getById.useQuery(
    { id: initialData.id },
    { initialData }
  );
  
  return <div>{data.name}</div>;
}
```

---

## 🔐 Procedures por Tipo

### Public (sem autenticação)
```tsx
const { data } = trpc.public.endpoint.useQuery();
```

### Protected (autenticado)
```tsx
const { data } = trpc.users.me.useQuery();
```

### Admin (role ADMIN)
```tsx
const { data } = trpc.users.list.useQuery();
```

### Manager (role ADMIN ou MANAGER)
```tsx
const createProject = trpc.projects.create.useMutation();
```

### Permission (permissão específica)
```tsx
const { data } = trpc.financial.list.useQuery();
// Requer canManageFinancial = true
```

---

## 🎨 Padrões Comuns

### Lista com Filtros
```tsx
function UsersList() {
  const [search, setSearch] = useState('');
  const { data } = trpc.users.list.useQuery({ search });
  
  return (
    <>
      <input value={search} onChange={(e) => setSearch(e.target.value)} />
      {data?.users.map(u => <div>{u.name}</div>)}
    </>
  );
}
```

### Formulário de Criação
```tsx
function CreateForm() {
  const utils = trpc.useUtils();
  const create = trpc.users.create.useMutation({
    onSuccess: () => {
      utils.users.list.invalidate();
      alert('Criado!');
    },
  });
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      create.mutate({ /* dados */ });
    }}>
      {/* campos */}
      <button type="submit" disabled={create.isPending}>
        {create.isPending ? 'Criando...' : 'Criar'}
      </button>
    </form>
  );
}
```

### Detalhes com Edição
```tsx
function Details({ id }) {
  const utils = trpc.useUtils();
  const { data } = trpc.projects.getById.useQuery({ id });
  const update = trpc.projects.update.useMutation({
    onSuccess: () => {
      utils.projects.getById.invalidate({ id });
    },
  });
  
  return (
    <div>
      <h1>{data?.name}</h1>
      <button onClick={() => update.mutate({ id, status: 'COMPLETED' })}>
        Concluir
      </button>
    </div>
  );
}
```

### Dashboard com Múltiplas Queries
```tsx
function Dashboard() {
  const { data: stats } = trpc.projects.stats.useQuery();
  const { data: recent } = trpc.projects.list.useQuery({ limit: 5 });
  const { data: user } = trpc.users.me.useQuery();
  
  return (
    <div>
      <h1>Olá, {user?.name}</h1>
      <div>Total de projetos: {stats?.total}</div>
      {recent?.projects.map(p => <div>{p.name}</div>)}
    </div>
  );
}
```

---

## 🛠️ Criar Novo Router

### 1. Criar arquivo do router
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

### 2. Adicionar ao app router
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

### 3. Usar no componente
```tsx
const { data } = trpc.clients.list.useQuery();
```

---

## 🐛 Troubleshooting

### Erro de Tipo
```bash
# Reiniciar TypeScript server
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

### UNAUTHORIZED
```tsx
// Verificar autenticação
const { data: user } = trpc.users.me.useQuery();
console.log('User:', user);
```

### Cache não atualiza
```tsx
// Forçar refetch
const { refetch } = trpc.users.list.useQuery();
refetch();

// Ou invalidar
const utils = trpc.useUtils();
utils.users.list.invalidate();
```

---

## 📚 Recursos

- [tRPC Docs](https://trpc.io)
- [TanStack Query Docs](https://tanstack.com/query)
- [Zod Docs](https://zod.dev)

---

## 🎯 Routers Disponíveis

### Users (`trpc.users.*`)
- `me()` - Usuário atual
- `list({ search?, role?, ... })` - Lista
- `getById({ id })` - Por ID
- `create({ ... })` - Criar
- `update({ id, ... })` - Atualizar
- `delete({ id })` - Deletar
- `stats()` - Estatísticas

### Projects (`trpc.projects.*`)
- `list({ search?, status?, ... })` - Lista
- `getById({ id })` - Por ID
- `create({ ... })` - Criar
- `update({ id, ... })` - Atualizar
- `delete({ id })` - Deletar
- `stats()` - Estatísticas
- `byEngineer({ engineerId })` - Por engenheiro

### Financial (`trpc.financial.*`)
- `list({ type?, status?, ... })` - Lista
- `getById({ id })` - Por ID
- `create({ ... })` - Criar
- `update({ id, ... })` - Atualizar
- `delete({ id })` - Deletar
- `stats({ dateFrom?, dateTo? })` - Estatísticas
- `cashFlow({ dateFrom, dateTo })` - Fluxo de caixa
- `bankAccounts()` - Contas bancárias
- `costCenters()` - Centros de custo

---

**Happy coding! 🚀**
