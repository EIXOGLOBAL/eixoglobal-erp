/**
 * tRPC Server Configuration
 * 
 * This file sets up the tRPC server with:
 * - Context creation with database and session
 * - Authentication middleware
 * - Error handling
 * - Type-safe procedures
 */

import { initTRPC, TRPCError } from '@trpc/server';
import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { db } from '@/lib/db';
import { getSession, type SessionPayload } from '@/lib/session';

/**
 * Context type for tRPC procedures
 * Contains database instance and user session
 */
export type Context = {
  db: typeof db;
  session: SessionPayload | null;
  user: SessionPayload['user'];
};

/**
 * Create context for each request
 * This runs on every tRPC request and provides access to:
 * - Database instance
 * - User session (if authenticated)
 */
export async function createContext(opts?: FetchCreateContextFnOptions): Promise<Context> {
  const session = await getSession();
  
  return {
    db,
    session,
    user: session?.user ?? null,
  };
}

/**
 * Initialize tRPC with context and transformer
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Export reusable router and procedure helpers
 */
export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

/**
 * Middleware to check if user is authenticated
 * Throws UNAUTHORIZED error if no session exists
 */
const isAuthenticated = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Você precisa estar autenticado para acessar este recurso',
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
    },
  });
});

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(isAuthenticated);

/**
 * Middleware to check if user has admin role
 */
const isAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Você precisa estar autenticado para acessar este recurso',
    });
  }

  if (ctx.user.role !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Você não tem permissão para acessar este recurso',
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
    },
  });
});

/**
 * Admin procedure - requires admin role
 */
export const adminProcedure = t.procedure.use(isAdmin);

/**
 * Middleware to check if user has manager role or higher
 */
const isManager = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Você precisa estar autenticado para acessar este recurso',
    });
  }

  const allowedRoles = ['ADMIN', 'MANAGER'];
  if (!ctx.user.role || !allowedRoles.includes(ctx.user.role)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Você não tem permissão para acessar este recurso',
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
    },
  });
});

/**
 * Manager procedure - requires manager role or higher
 */
export const managerProcedure = t.procedure.use(isManager);

/**
 * Middleware to check specific permissions
 */
export const hasPermission = (permission: keyof NonNullable<SessionPayload['user']>) => {
  return t.middleware(async ({ ctx, next }) => {
    if (!ctx.session || !ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Você precisa estar autenticado para acessar este recurso',
      });
    }

    if (!ctx.user[permission]) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Você não tem permissão para realizar esta ação',
      });
    }

    return next({
      ctx: {
        ...ctx,
        session: ctx.session,
        user: ctx.user,
      },
    });
  });
};
