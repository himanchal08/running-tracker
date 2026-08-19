import { open } from '@op-engineering/op-sqlite';
import { drizzle } from 'drizzle-orm/op-sqlite';
import { migrate } from 'drizzle-orm/op-sqlite/migrator';
import * as schema from './schema';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const migrations = require('./migrations/migrations');

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _rawConn: ReturnType<typeof open> | null = null;

export function getDb() {
  if (_db) return _db;

  const opsqlite = open({ name: 'movement_tracker.db' });
  _rawConn = opsqlite;
  opsqlite.execute('PRAGMA journal_mode = WAL;');
  opsqlite.execute('PRAGMA busy_timeout = 5000;');
  opsqlite.execute('PRAGMA synchronous = NORMAL;');
  
  _db = drizzle(opsqlite, { schema });
  try {
    migrate(_db, migrations);
  } catch (err) {
    console.warn('Migration warning (likely already exists):', err);
  }
  return _db;
}

/**
 * Closes the raw op-sqlite connection and clears the cached drizzle instance.
 * Call before overwriting the database file (e.g. during import).
 */
export function closeDb(): void {
  try {
    _rawConn?.close();
  } catch (err) {
    console.warn('[db/client] closeDb error:', err);
  }
  _db = null;
  _rawConn = null;
}

/**
 * Re-opens the database (runs migrations) after it has been closed.
 * Returns the fresh instance.
 */
export function reopenDb() {
  _db = null;
  _rawConn = null;
  return getDb();
}

export type Db = ReturnType<typeof getDb>;
