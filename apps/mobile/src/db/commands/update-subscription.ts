import type { Kysely } from 'kysely';
import type { NewId } from '@/db/executor';
import { correctionsRepository, type SubscriptionEdit, subscriptionsRepository } from '@/db/repositories/subscriptions';
import { resyncSubscription } from '@/db/sync/resync';
import type { DB } from '@/db/types';
import type { EditOptions } from './edit-options';

export async function updateSubscription(
  db: Kysely<DB>,
  subscriptionId: string,
  edit: SubscriptionEdit,
  today: string,
  newId: NewId,
  options: EditOptions = {},
): Promise<void> {
  await db.transaction().execute(async (trx) => {
    const row = await trx.selectFrom('subscription').selectAll().where('id', '=', subscriptionId).executeTakeFirstOrThrow();
    await subscriptionsRepository(trx).update(row, edit);
    if (row.amount_cents !== edit.amountCents && row.status !== 'trial') {
      await trx
        .insertInto('event')
        .values({
          id: newId(),
          subscription_id: subscriptionId,
          type: 'price_change',
          occurred_on: today,
          payload: JSON.stringify({ from: row.amount_cents, to: edit.amountCents }),
        })
        .execute();
    }
    if (options.correction) {
      await correctionsRepository(trx).save(edit.name, options.correction.categoryId, options.correction.iconKey);
    }
    await resyncSubscription(trx, subscriptionId, today, newId);
  });
}
