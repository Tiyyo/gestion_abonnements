import type { LifecycleState } from '@abonnements/core';
import type { Subscription, SubscriptionUpdate } from '@/db/types';

/**
 * Colonnes d'abonnement à écrire après une transition. Le jour d'ancrage ne suit la prochaine échéance
 * que si elle a changé (et jamais pour un rythme hebdomadaire).
 */
export function subscriptionStatePatch(row: Subscription, state: LifecycleState, nextChargeDate: string): SubscriptionUpdate {
  return {
    status: state.status,
    amount_cents: state.amountCents,
    next_charge_date: nextChargeDate,
    anchor_day:
      nextChargeDate === row.next_charge_date || state.periodUnit === 'week' ? row.anchor_day : Number(nextChargeDate.slice(8, 10)),
    trial_end_date: state.trialEndDate,
    post_trial_amount_cents: state.postTrialAmountCents,
    period_end_date: state.periodEndDate,
    cancel_done: state.cancelDone ? 1 : 0,
  };
}
