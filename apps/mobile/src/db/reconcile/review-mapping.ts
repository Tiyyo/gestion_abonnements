import type { NewEvent, ReconcilableCharge } from '@abonnements/core';
import type { Charge, Subscription } from '@/db/types';

export function toReconcilable(charge: Charge): ReconcilableCharge {
  return {
    id: charge.id,
    subscriptionId: charge.subscription_id,
    dueDate: charge.due_date,
    status: charge.status,
    expectedAmountCents: charge.expected_amount_cents,
    fundedAmountCents: charge.funded_amount_cents,
  };
}

/** Après résiliation, un prélèvement inattendu est requalifié en prélèvement post-résiliation. */
export function relabelAfterCancel(events: readonly NewEvent[], status: Subscription['status']): readonly NewEvent[] {
  return status === 'cancelled'
    ? events.map((e) => (e.type === 'unexpected_charge' ? { ...e, type: 'post_cancel_charge' as const } : e))
    : events;
}
