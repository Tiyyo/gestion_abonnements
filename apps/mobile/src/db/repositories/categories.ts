import type { Kysely } from 'kysely';
import type { DB } from '@/db/types';

export function listCategories(db: Kysely<DB>) {
  return db.selectFrom('category').selectAll().orderBy('sort_order').execute();
}
