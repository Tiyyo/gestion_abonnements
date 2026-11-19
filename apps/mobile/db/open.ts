import { openDatabaseSync } from 'expo-sqlite';
import { SqliteDialect } from 'kysely';
import { createDb } from './client';
import { toKyselyDatabase } from './expo-sqlite-database';

export function openAppDb() {
  return createDb(new SqliteDialect({ database: toKyselyDatabase(openDatabaseSync('abonnements.db')) }));
}
