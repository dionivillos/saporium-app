import SQLite from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import type { Database } from '@/db/client';
import * as schema from '@/db/schema';

/**
 * An in-memory database with the real migrations applied, so tests exercise the
 * same SQL that ships in the app. `expo-sqlite` cannot run under Jest, but the
 * schema is plain `sqlite-core` and the query helpers take any sync connection.
 */
export function createTestDatabase(): Database {
  const sqlite = new SQLite(':memory:');
  // Matches the pragma the app sets; without it cascades are silently skipped.
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: './src/db/migrations' });

  return db;
}
