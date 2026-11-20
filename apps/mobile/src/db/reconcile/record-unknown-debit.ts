import type { UnknownDebit } from '@abonnements/core';
import type { Kysely } from 'kysely';
import type { NewId } from '@/db/executor';
import type { DB } from '@/db/types';
import type { DebitOutcome } from './classify-debit';

export async function recordUnknownDebit(
  db: Kysely<DB>,
  debit: UnknownDebit,
  outcome: Extract<DebitOutcome, { kind: 'event' }>,
  newId: NewId,
): Promise<void> {
  await db
    .insertInto('event')
    .values({
      id: newId(),
      subscription_id: outcome.subscriptionId,
      type: outcome.type,
      occurred_on: debit.date,
      amount_cents: debit.amountCents,
      payload: JSON.stringify({ name: debit.name.trim() }),
    })
    .execute();
}
