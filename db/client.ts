import { open } from '@op-engineering/op-sqlite';
import { drizzle } from 'drizzle-orm/op-sqlite';
import { migrate } from 'drizzle-orm/op-sqlite/migrator';
import * as schema from './schema';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const migrations = require('./migrations/migrations');

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (_db) return _db;

  const opsqlite = open({ name: 'movement_tracker.db' });
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

export type Db = ReturnType<typeof getDb>;
