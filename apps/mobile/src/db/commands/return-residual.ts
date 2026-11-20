import type { Kysely } from 'kysely';
import type { NewId } from '@/db/executor';
import { nowIso } from '@/db/now-iso';
import type { DB } from '@/db/types';

export async function returnResidual(db: Kysely<DB>, amountCents: number, today: string, newId: NewId): Promise<void> {
  await db
    .insertInto('transfer')
    .values({ id: newId(), type: 'residual_return', planned_date: today, amount_cents: amountCents, status: 'done', done_at: nowIso() })
    .execute();
}
