import { drizzle } from 'drizzle-orm/expo-sqlite';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import * as SQLite from 'expo-sqlite';

import * as schema from './schema';

export const DATABASE_NAME = 'saporium.db';

/**
 * Any synchronous SQLite connection running our schema. Query helpers take
 * this rather than the concrete Expo type so they can be exercised against an
 * in-memory database in tests.
 */
export type Database = BaseSQLiteDatabase<'sync', unknown, typeof schema>;

/** `enableChangeListener` is what makes `useLiveQuery` re-render on writes. */
export const sqliteDb = SQLite.openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });

// SQLite ignores `ON DELETE CASCADE` unless foreign keys are switched on, and
// the pragma is per connection.
sqliteDb.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqliteDb, { schema });
