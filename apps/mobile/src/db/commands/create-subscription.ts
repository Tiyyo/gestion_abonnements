import type { Kysely } from 'kysely';
import type { NewId } from '@/db/executor';
import { correctionsRepository, type NewSubscriptionInput, subscriptionsRepository } from '@/db/repositories/subscriptions';
import { resyncSubscription } from '@/db/sync/resync';
import type { DB } from '@/db/types';
import type { EditOptions } from './edit-options';

export async function createSubscription(
  db: Kysely<DB>,
  input: NewSubscriptionInput,
  today: string,
  newId: NewId,
  options: EditOptions = {},
): Promise<string> {
  const id = newId();
  await db.transaction().execute(async (trx) => {
    await subscriptionsRepository(trx).insert(id, input);
    if (options.correction) {
      await correctionsRepository(trx).save(input.name, options.correction.categoryId, options.correction.iconKey);
    }
    await trx
      .insertInto('event')
      .values({
        id: newId(),
        subscription_id: id,
        type: 'status_change',
        occurred_on: today,
        payload: JSON.stringify({ from: null, to: input.status }),
      })
      .execute();
    await resyncSubscription(trx, id, today, newId);
  });
  return id;
}
