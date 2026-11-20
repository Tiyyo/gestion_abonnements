import { type LifecycleAction, transition } from '@abonnements/core';
import type { Transaction } from 'kysely';
import type { NewId } from '@/db/executor';
import { toSnapshot } from '@/db/sync/to-snapshot';
import type { DB } from '@/db/types';
import { subscriptionStatePatch } from './state-patch';

export async function applyTransition(
  trx: Transaction<DB>,
  subscriptionId: string,
  action: LifecycleAction,
  today: string,
  newId: NewId,
  patch: { nextChargeDate?: string } = {},
): Promise<void> {
  const row = await trx.selectFrom('subscription').selectAll().where('id', '=', subscriptionId).executeTakeFirstOrThrow();
  const { state, statusChange } = transition({ ...toSnapshot(row), cancelDone: row.cancel_done === 1 }, action, today);
  const nextChargeDate = patch.nextChargeDate ?? state.nextChargeDate;
  await trx
    .updateTable('subscription')
    .set(subscriptionStatePatch(row, state, nextChargeDate))
    .where('id', '=', subscriptionId)
    .execute();
  if (statusChange) {
    await trx
      .insertInto('event')
      .values({
        id: newId(),
        subscription_id: subscriptionId,
        type: 'status_change',
        occurred_on: today,
        payload: JSON.stringify(statusChange),
      })
      .execute();
  }
}
