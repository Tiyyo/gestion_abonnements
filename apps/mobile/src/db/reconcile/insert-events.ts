import type { NewEvent } from '@abonnements/core';
import type { Transaction } from 'kysely';
import type { NewId } from '@/db/executor';
import type { DB } from '@/db/types';

export async function insertEvents(trx: Transaction<DB>, events: readonly NewEvent[], newId: NewId): Promise<void> {
  for (const e of events) {
    await trx
      .insertInto('event')
      .values({
        id: newId(),
        subscription_id: e.subscriptionId,
        type: e.type,
        occurred_on: e.occurredOn,
        amount_cents: e.amountCents,
        payload: JSON.stringify(e.payload),
      })
      .execute();
  }
}
