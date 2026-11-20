import type { UnknownDebit } from '@abonnements/core';
import type { Kysely } from 'kysely';
import type { NewId } from '@/db/executor';
import type { DB } from '@/db/types';
import type { DebitOutcome } from './classify-debit';

/** `bankTransactionId` : le débit de la banque à l'origine de la saisie, soldé dans la même transaction. */
export async function recordUnknownDebit(
  db: Kysely<DB>,
  debit: UnknownDebit,
  outcome: Extract<DebitOutcome, { kind: 'event' }>,
  newId: NewId,
  bankTransactionId?: string,
): Promise<void> {
  const eventId = newId();
  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto('event')
      .values({
        id: eventId,
        subscription_id: outcome.subscriptionId,
        type: outcome.type,
        occurred_on: debit.date,
        amount_cents: debit.amountCents,
        payload: JSON.stringify({ name: debit.name.trim() }),
      })
      .execute();
    if (bankTransactionId) {
      await trx.updateTable('bank_transaction').set({ outcome: 'recorded', ref_id: eventId }).where('id', '=', bankTransactionId).execute();
    }
  });
}
