/**
 * Database connection factory for D1
 */
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema.js';

export type Database = ReturnType<typeof createDb>;

/**
 * Create a Drizzle database instance from a D1 binding
 */
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export { schema };
