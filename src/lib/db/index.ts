import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Get database URL from environment variable
const connectionString = process.env.DATABASE_URL!;

// Only validate and create connection if not in build mode
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

if (!connectionString && !isBuildTime) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create postgres client (only if not in build mode)
const client = connectionString && !isBuildTime 
  ? postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    })
  : null;

// Create drizzle instance with schema (use a dummy client during build)
export const db = client 
  ? drizzle(client, { schema })
  : drizzle({} as any, { schema }); // Dummy client for build time

// Export schema for use in other files
export * from './schema';
