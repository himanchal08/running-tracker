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
  _db = drizzle(opsqlite, { schema });
  migrate(_db, migrations);
  return _db;
}

export type Db = ReturnType<typeof getDb>;
