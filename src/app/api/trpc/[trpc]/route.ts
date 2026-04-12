/**
 * tRPC API Route Handler for Next.js App Router
 * 
 * This file handles all tRPC requests at /api/trpc/*
 * It uses the Next.js App Router fetch adapter
 */

import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/lib/trpc/routers/_app';
import { createContext } from '@/lib/trpc/server';

/**
 * Handle all tRPC requests
 * This handler supports both GET and POST requests
 */
const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? '<no-path>'}: ${error.message}`
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };
