import { type Ledger, todayIn } from '@abonnements/core';
import type { Kysely } from 'kysely';
import type { DB } from '../types';

export async function loadLedger(db: Kysely<DB>): Promise<Ledger> {
  const [transfers, charges, events] = await Promise.all([
    db.selectFrom('transfer').selectAll().execute(),
    db.selectFrom('charge').selectAll().execute(),
    db.selectFrom('event').selectAll().where('amount_cents', 'is not', null).execute(),
  ]);
  return {
    transfers: transfers.map((t) => ({
      type: t.type,
      status: t.status,
      plannedDate: t.planned_date,
      rescheduledDate: t.rescheduled_date,
      doneOn: t.done_at ? todayIn(undefined, new Date(t.done_at)) : null,
      amountCents: t.amount_cents,
    })),
    charges: charges.map((c) => ({
      status: c.status,
      dueDate: c.due_date,
      fundedAmountCents: c.funded_amount_cents,
      expectedAmountCents: c.expected_amount_cents,
      actualAmountCents: c.actual_amount_cents,
      actualDate: c.actual_date,
      provisionOnly: c.provision_only === 1,
    })),
    events: events.map((e) => ({
      type: e.type,
      occurredOn: e.occurred_on,
      amountCents: e.amount_cents,
      linkedToCharge: typeof (JSON.parse(e.payload) as { chargeId?: unknown }).chargeId === 'string',
    })),
  };
}
