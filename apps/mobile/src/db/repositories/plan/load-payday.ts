import type { PaydayPeriod } from '@abonnements/core';
import type { Kysely } from 'kysely';
import type { DB } from '@/db/types';
import { computePayday } from './compute-payday';
import { findPaydayTransfer } from './payday-transfer';
import type { PaydayView } from './types';

/** Virement de paie du mois : enregistré s'il a été fait, sinon calculé. */
export async function loadPayday(db: Kysely<DB>, period: PaydayPeriod): Promise<PaydayView> {
  const stored = await findPaydayTransfer(db, period.start);
  if (!stored) {
    const computed = await computePayday(db, period);
    return { date: period.start, transferId: null, done: false, ...computed };
  }
  const provisions = await db
    .selectFrom('transfer_charge')
    .innerJoin('charge', 'charge.id', 'transfer_charge.charge_id')
    .innerJoin('subscription', 'subscription.id', 'charge.subscription_id')
    .select(['subscription.id', 'subscription.name', 'transfer_charge.amount_cents'])
    .where('transfer_charge.transfer_id', '=', stored.id)
    .execute();
  const provisionTotal = provisions.reduce((t, p) => t + p.amount_cents, 0);
  return {
    date: period.start,
    transferId: stored.id,
    done: stored.status === 'done',
    totalCents: stored.amount_cents,
    lines: [
      { kind: 'charges', subscriptionId: null, name: null, amountCents: stored.amount_cents - provisionTotal },
      ...provisions.map((p) => ({ kind: 'provision' as const, subscriptionId: p.id, name: p.name, amountCents: p.amount_cents })),
    ],
  };
}
