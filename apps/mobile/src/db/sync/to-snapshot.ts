import type { StoredCharge, SubscriptionSnapshot } from '@abonnements/core';
import type { Charge, Subscription } from '@/db/types';

export function toSnapshot(row: Subscription): SubscriptionSnapshot {
  return {
    id: row.id,
    status: row.status,
    paymentMethod: row.payment_method,
    amountCents: row.amount_cents,
    periodUnit: row.period_unit,
    periodCount: row.period_count,
    anchorDay: row.anchor_day,
    nextChargeDate: row.next_charge_date,
    trialEndDate: row.trial_end_date,
    postTrialAmountCents: row.post_trial_amount_cents,
    periodEndDate: row.period_end_date,
    marginOverrideBp: row.margin_override_bp,
    archived: row.archived_at !== null,
  };
}

export function toStoredCharge(c: Charge): StoredCharge {
  return {
    id: c.id,
    subscriptionId: c.subscription_id,
    dueDate: c.due_date,
    provisionOnly: c.provision_only === 1,
    status: c.status,
    expectedAmountCents: c.expected_amount_cents,
    fundedAmountCents: c.funded_amount_cents,
    isTrialConversion: c.is_trial_conversion === 1,
  };
}
