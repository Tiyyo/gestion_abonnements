import { compareDates, suggestedPeriodEnd } from '@abonnements/core';
import type { Kysely } from 'kysely';
import type { NewId } from '@/db/executor';
import { resyncSubscription } from '@/db/sync/resync';
import { toSnapshot } from '@/db/sync/to-snapshot';
import type { DB } from '@/db/types';
import { applyTransition } from './apply-transition';
import { firstDueOnOrAfter } from './due-dates';

export async function decideAfterPaidTrial(
  db: Kysely<DB>,
  subscriptionId: string,
  decision: 'keep' | 'cancel',
  today: string,
  newId: NewId,
): Promise<void> {
  await db.transaction().execute(async (trx) => {
    const row = await trx.selectFrom('subscription').selectAll().where('id', '=', subscriptionId).executeTakeFirstOrThrow();
    const snapshot = { ...toSnapshot(row), status: 'active' as const, nextChargeDate: row.trial_end_date ?? row.next_charge_date };
    const next = firstDueOnOrAfter(snapshot, today);
    await applyTransition(trx, subscriptionId, { type: 'keep_trial' }, today, newId, { nextChargeDate: next });
    if (decision === 'cancel') {
      const end = suggestedPeriodEnd(next);
      await applyTransition(trx, subscriptionId, { type: 'stop', periodEndDate: compareDates(end, today) < 0 ? today : end }, today, newId);
    }
    await resyncSubscription(trx, subscriptionId, today, newId);
  });
}
