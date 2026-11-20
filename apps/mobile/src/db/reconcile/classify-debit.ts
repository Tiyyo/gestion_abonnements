import { classifyUnknownDebit, type NewEvent, type UnknownDebit } from '@abonnements/core';
import type { Kysely } from 'kysely';
import type { DB } from '@/db/types';

export type DebitOutcome =
  | { kind: 'matches_charge'; chargeId: string; name: string; dueDate: string }
  | { kind: 'event'; type: NewEvent['type']; subscriptionId: string | null; offerCreateSubscription: boolean };

export async function classifyDebit(db: Kysely<DB>, debit: UnknownDebit): Promise<DebitOutcome> {
  const subs = await db.selectFrom('subscription').selectAll().where('archived_at', 'is', null).execute();
  const charges = await db.selectFrom('charge').selectAll().where('provision_only', '=', 0).execute();
  const result = classifyUnknownDebit(
    debit,
    subs.map((s) => ({ id: s.id, name: s.name, status: s.status, periodUnit: s.period_unit, periodCount: s.period_count })),
    charges.map((c) => ({
      id: c.id,
      subscriptionId: c.subscription_id,
      dueDate: c.due_date,
      status: c.status,
      expectedAmountCents: c.expected_amount_cents,
      fundedAmountCents: c.funded_amount_cents,
      actualDate: c.actual_date,
    })),
  );
  if (result.kind === 'matches_charge') {
    const charge = charges.find((c) => c.id === result.chargeId);
    const sub = subs.find((s) => s.id === charge?.subscription_id);
    return { kind: 'matches_charge', chargeId: result.chargeId, name: sub?.name ?? debit.name, dueDate: charge?.due_date ?? debit.date };
  }
  return {
    kind: 'event',
    type: result.event.type,
    subscriptionId: result.event.subscriptionId,
    offerCreateSubscription: result.offerCreateSubscription,
  };
}
