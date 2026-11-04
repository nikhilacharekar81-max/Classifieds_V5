/**
 * Authoritative PostgreSQL Database Export
 * All domain repositories interact directly with this persistent Drizzle ORM instance.
 * Ephemeral in-memory Maps and Sets have been removed.
 */
export { db, pool, createPool } from '@/src/db/index';
