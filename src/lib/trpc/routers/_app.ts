/**
 * Root App Router
 * 
 * This is the main tRPC router that combines all sub-routers.
 * Add new routers here as you create them.
 */

import { router } from '../server';
import { usersRouter } from './users';
import { projectsRouter } from './projects';
import { financialRouter } from './financial';

/**
 * Main application router
 * 
 * All sub-routers are merged here to create the complete API
 */
export const appRouter = router({
  users: usersRouter,
  projects: projectsRouter,
  financial: financialRouter,
});

/**
 * Export type definition of the API
 * This is used by the client to get full type safety
 */
export type AppRouter = typeof appRouter;
