# Guia Rápido de Migração: REST → tRPC

## 🔄 Padrões de Migração

### 1. GET Simples

#### ❌ Antes (REST)
```typescript
// app/api/users/route.ts
export async function GET() {
  const users = await db.query.users.findMany();
  return Response.json(users);
}

// Componente
const response = await fetch('/api/users');
const users = await response.json();
```

#### ✅ Depois (tRPC)
```typescript
// lib/trpc/routers/users.ts
list: protectedProcedure.query(async ({ ctx }) => {
  return await ctx.db.query.users.findMany();
}),

// Componente
const { data: users } = trpc.users.list.useQuery();
```

---

### 2. GET com Query Parameters

#### ❌ Antes (REST)
```typescript
// app/api/projects/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '10');

  const projects = await db.query.projects.findMany({
    where: status ? eq(projects.status, status) : undefined,
    limit,
  });

  return Response.json(projects);
}

// Componente
const response = await fetch('/api/projects?status=IN_PROGRESS&limit=20');
const projects = await response.json();
```

#### ✅ Depois (tRPC)
```typescript
// lib/trpc/routers/projects.ts
list: protectedProcedure
  .input(z.object({
    status: z.enum(['PLANNING', 'IN_PROGRESS', 'COMPLETED']).optional(),
    limit: z.number().min(1).max(100).default(10),
  }))
  .query(async ({ ctx, input }) => {
    return await ctx.db.query.projects.findMany({
      where: input.status ? eq(projects.status, input.status) : undefined,
      limit: input.limit,
    });
  }),

// Componente
const { data: projects } = trpc.projects.list.useQuery({
  status: 'IN_PROGRESS',
  limit: 20,
});
```

---

### 3. GET por ID (Dynamic Route)

#### ❌ Antes (REST)
```typescript
// app/api/projects/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, params.id),
  });

  if (!project) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  return Response.json(project);
}

// Componente
const response = await fetch(`/api/projects/${id}`);
const project = await response.json();
```

#### ✅ Depois (tRPC)
```typescript
// lib/trpc/routers/projects.ts
getById: protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const project = await ctx.db.query.projects.findFirst({
      where: eq(projects.id, input.id),
    });

    if (!project) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Projeto não encontrado',
      });
    }

    return project;
  }),

// Componente
const { data: project } = trpc.projects.getById.useQuery({ id });
```

---

### 4. POST (Create)

#### ❌ Antes (REST)
```typescript
// app/api/projects/route.ts
export async function POST(request: Request) {
  const body = await request.json();

  // Validação manual
  if (!body.name || !body.startDate) {
    return Response.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const [project] = await db.insert(projects).values(body).returning();
  return Response.json(project);
}

// Componente
const response = await fetch('/api/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Novo Projeto', startDate: new Date() }),
});
const project = await response.json();
```

#### ✅ Depois (tRPC)
```typescript
// lib/trpc/routers/projects.ts
create: managerProcedure
  .input(z.object({
    name: z.string().min(1),
    startDate: z.date(),
    status: z.enum(['PLANNING', 'IN_PROGRESS']).default('PLANNING'),
  }))
  .mutation(async ({ ctx, input }) => {
    const [project] = await ctx.db.insert(projects).values({
      ...input,
      companyId: ctx.user.companyId,
    }).returning();
    
    return project;
  }),

// Componente
const createProject = trpc.projects.create.useMutation({
  onSuccess: () => {
    console.log('Projeto criado!');
  },
});

createProject.mutate({
  name: 'Novo Projeto',
  startDate: new Date(),
});
```

---

### 5. PATCH/PUT (Update)

#### ❌ Antes (REST)
```typescript
// app/api/projects/[id]/route.ts
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();

  const [project] = await db
    .update(projects)
    .set(body)
    .where(eq(projects.id, params.id))
    .returning();

  return Response.json(project);
}

// Componente
const response = await fetch(`/api/projects/${id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'COMPLETED' }),
});
const project = await response.json();
```

#### ✅ Depois (tRPC)
```typescript
// lib/trpc/routers/projects.ts
update: managerProcedure
  .input(z.object({
    id: z.string().uuid(),
    name: z.string().optional(),
    status: z.enum(['PLANNING', 'IN_PROGRESS', 'COMPLETED']).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const { id, ...updateData } = input;

    const [project] = await ctx.db
      .update(projects)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();

    return project;
  }),

// Componente
const updateProject = trpc.projects.update.useMutation();

updateProject.mutate({
  id,
  status: 'COMPLETED',
});
```

---

### 6. DELETE

#### ❌ Antes (REST)
```typescript
// app/api/projects/[id]/route.ts
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  await db.delete(projects).where(eq(projects.id, params.id));
  return Response.json({ success: true });
}

// Componente
await fetch(`/api/projects/${id}`, { method: 'DELETE' });
```

#### ✅ Depois (tRPC)
```typescript
// lib/trpc/routers/projects.ts
delete: managerProcedure
  .input(z.object({ id: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    await ctx.db.delete(projects).where(eq(projects.id, input.id));
    return { success: true };
  }),

// Componente
const deleteProject = trpc.projects.delete.useMutation();

deleteProject.mutate({ id });
```

---

### 7. Autenticação

#### ❌ Antes (REST)
```typescript
// app/api/protected/route.ts
export async function GET(request: Request) {
  const session = await getSession();
  
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Lógica protegida
  return Response.json({ data: 'Protected data' });
}
```

#### ✅ Depois (tRPC)
```typescript
// lib/trpc/routers/protected.ts
getData: protectedProcedure.query(async ({ ctx }) => {
  // ctx.user já está disponível e validado
  return { data: 'Protected data', user: ctx.user };
}),
```

---

### 8. Paginação

#### ❌ Antes (REST)
```typescript
// app/api/projects/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const offset = (page - 1) * limit;

  const [projects, total] = await Promise.all([
    db.query.projects.findMany({ limit, offset }),
    db.$count(projects),
  ]);

  return Response.json({
    projects,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
```

#### ✅ Depois (tRPC)
```typescript
// lib/trpc/routers/projects.ts
list: protectedProcedure
  .input(z.object({
    limit: z.number().min(1).max(100).default(10),
    offset: z.number().min(0).default(0),
  }))
  .query(async ({ ctx, input }) => {
    const [projects, total] = await Promise.all([
      ctx.db.query.projects.findMany({
        limit: input.limit,
        offset: input.offset,
      }),
      ctx.db.$count(projects),
    ]);

    return {
      projects,
      total,
      hasMore: input.offset + input.limit < total,
    };
  }),

// Componente
const { data } = trpc.projects.list.useQuery({
  limit: 20,
  offset: 0,
});
```

---

### 9. Relacionamentos (Joins)

#### ❌ Antes (REST)
```typescript
// app/api/projects/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, params.id),
    with: {
      engineer: true,
      client: true,
    },
  });

  return Response.json(project);
}
```

#### ✅ Depois (tRPC)
```typescript
// lib/trpc/routers/projects.ts
getById: protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    return await ctx.db.query.projects.findFirst({
      where: eq(projects.id, input.id),
      with: {
        engineer: {
          columns: { id: true, name: true, email: true },
        },
        client: true,
      },
    });
  }),
```

---

### 10. Agregações e Estatísticas

#### ❌ Antes (REST)
```typescript
// app/api/projects/stats/route.ts
export async function GET() {
  const [total, inProgress, completed] = await Promise.all([
    db.$count(projects),
    db.$count(projects, eq(projects.status, 'IN_PROGRESS')),
    db.$count(projects, eq(projects.status, 'COMPLETED')),
  ]);

  return Response.json({ total, inProgress, completed });
}
```

#### ✅ Depois (tRPC)
```typescript
// lib/trpc/routers/projects.ts
stats: protectedProcedure.query(async ({ ctx }) => {
  const [total, inProgress, completed] = await Promise.all([
    ctx.db.$count(projects),
    ctx.db.$count(projects, eq(projects.status, 'IN_PROGRESS')),
    ctx.db.$count(projects, eq(projects.status, 'COMPLETED')),
  ]);

  return { total, inProgress, completed };
}),

// Componente
const { data: stats } = trpc.projects.stats.useQuery();
```

---

## 🎯 Checklist de Migração

Para cada endpoint REST:

- [ ] Identificar o tipo de operação (query ou mutation)
- [ ] Definir o schema de validação com Zod
- [ ] Escolher o procedure correto (public, protected, admin, etc.)
- [ ] Implementar a lógica no router
- [ ] Adicionar tratamento de erros com TRPCError
- [ ] Atualizar componentes para usar hooks tRPC
- [ ] Testar a funcionalidade
- [ ] Remover o endpoint REST antigo
- [ ] Atualizar documentação

---

## 💡 Dicas

1. **Comece pelos endpoints mais simples** (GET sem parâmetros)
2. **Migre um módulo por vez** (ex: todos os endpoints de users)
3. **Mantenha ambos funcionando** durante a transição
4. **Use TypeScript** para detectar erros de migração
5. **Teste cada endpoint** após migração
6. **Aproveite o cache** do TanStack Query
7. **Use optimistic updates** para melhor UX

---

## 🚀 Benefícios Imediatos

✅ **Type Safety** - Erros detectados antes de rodar
✅ **Auto-complete** - IntelliSense em todo lugar
✅ **Menos código** - ~50% menos código
✅ **Validação automática** - Zod valida tudo
✅ **Cache inteligente** - TanStack Query gerencia
✅ **Melhor DX** - Developer Experience superior
✅ **Refactoring seguro** - Renomeie com confiança

---

**Boa migração! 🎉**
