import { nthDueDate } from '@abonnements/core';
import type { Kysely, Transaction } from 'kysely';
import type { NewId } from '@/db/executor';
import { syncSubscriptionCharges } from '@/db/sync/sync-subscription-charges';
import { syncTransfers } from '@/db/sync/sync-transfers';
import { toSnapshot } from '@/db/sync/to-snapshot';
import type { DB } from '@/db/types';
import { applyTransition } from './apply-transition';
import { closedPastDueCount } from './due-dates';

/** Clôt les résiliations confirmées dont la période est passée. */
async function finalizeCancellations(trx: Transaction<DB>, today: string, newId: NewId): Promise<number> {
  const toFinalize = await trx
    .selectFrom('subscription')
    .select('id')
    .where('status', '=', 'to_cancel')
    .where('cancel_done', '=', 1)
    .where('period_end_date', '<', today)
    .where('archived_at', 'is', null)
    .execute();
  for (const { id } of toFinalize) {
    await applyTransition(trx, id, { type: 'finalize_cancel' }, today, newId);
    await syncSubscriptionCharges(trx, id, today, newId);
  }
  return toFinalize.length;
}

/** Avance la prochaine échéance des abonnements dont les échéances passées sont toutes closes. */
async function advanceStaleSchedules(trx: Transaction<DB>, today: string, newId: NewId): Promise<number> {
  let changed = 0;
  const stale = await trx
    .selectFrom('subscription')
    .selectAll()
    .where('status', 'in', ['active', 'to_cancel'])
    .where('next_charge_date', '<', today)
    .where('archived_at', 'is', null)
    .execute();
  for (const row of stale) {
    const closed = new Set(
      (
        await trx
          .selectFrom('charge')
          .select('due_date')
          .where('subscription_id', '=', row.id)
          .where('provision_only', '=', 0)
          .where('status', 'in', ['paid', 'failed', 'skipped'])
          .execute()
      ).map((c) => c.due_date),
    );
    const snapshot = toSnapshot(row);
    const n = closedPastDueCount(snapshot, today, closed);
    if (n > 0) {
      await trx
        .updateTable('subscription')
        .set({ next_charge_date: nthDueDate(snapshot, n) })
        .where('id', '=', row.id)
        .execute();
      await syncSubscriptionCharges(trx, row.id, today, newId);
      changed += 1;
    }
  }
  return changed;
}

export async function runDailyMaintenance(db: Kysely<DB>, today: string, newId: NewId): Promise<number> {
  return db.transaction().execute(async (trx) => {
    const changed = (await finalizeCancellations(trx, today, newId)) + (await advanceStaleSchedules(trx, today, newId));
    if (changed > 0) {
      await syncTransfers(trx, newId);
    }
    return changed;
  });
}
