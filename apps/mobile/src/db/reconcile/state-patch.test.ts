import type { LifecycleState } from '@abonnements/core';
import type { Subscription } from '@/db/types';
import { subscriptionStatePatch } from './state-patch';

const row: Subscription = {
  id: 's1',
  name: 'Netflix',
  category_id: 'cat-autre',
  icon_key: 'tag',
  amount_cents: 1399,
  currency: 'EUR',
  fx_buffer_bp: 0,
  period_unit: 'month',
  period_count: 1,
  anchor_day: 31,
  next_charge_date: '2026-11-30',
  status: 'trial',
  payment_method: 'revolut',
  margin_override_bp: null,
  trial_end_date: '2026-11-30',
  post_trial_amount_cents: 1399,
  period_end_date: null,
  cancel_done: 0,
  cancel_url: null,
  ai_suggestion: null,
  notes: null,
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
  archived_at: null,
};

const state: LifecycleState = {
  id: 's1',
  status: 'active',
  paymentMethod: 'revolut',
  amountCents: 1399,
  periodUnit: 'month',
  periodCount: 1,
  anchorDay: 31,
  nextChargeDate: '2026-11-30',
  trialEndDate: null,
  postTrialAmountCents: null,
  periodEndDate: null,
  marginOverrideBp: null,
  archived: false,
  cancelDone: true,
};

describe('subscriptionStatePatch', () => {
  it('garde le jour d’ancrage quand la prochaine échéance ne bouge pas', () => {
    const patch = subscriptionStatePatch(row, state, '2026-11-30');
    expect(patch).toMatchObject({ status: 'active', anchor_day: 31, trial_end_date: null, cancel_done: 1 });
  });

  it('réancre sur le jour de la nouvelle échéance', () => {
    expect(subscriptionStatePatch(row, state, '2026-12-15').anchor_day).toBe(15);
  });

  it('ne réancre jamais un rythme hebdomadaire', () => {
    const weekly = { ...row, period_unit: 'week' as const, anchor_day: null };
    expect(subscriptionStatePatch(weekly, { ...state, periodUnit: 'week' }, '2026-12-15').anchor_day).toBeNull();
  });
});
