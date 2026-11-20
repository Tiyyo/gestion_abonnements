import { pendingQuestion } from '@abonnements/core';
import { toSnapshot } from '@/db/sync/to-snapshot';
import type { Subscription } from '@/db/types';
import type { HomeChargeRow, HomeQuestion } from './types';

function questionFor(sub: Subscription, charges: readonly HomeChargeRow[], today: string): HomeQuestion | null {
  const conversion = charges.find((c) => c.subscription_id === sub.id && c.is_trial_conversion === 1);
  const question = pendingQuestion({ ...toSnapshot(sub), cancelDone: sub.cancel_done === 1 }, today, conversion?.status ?? null);
  const base = { subscriptionId: sub.id, name: sub.name, cancelUrl: sub.cancel_url };
  if (question?.kind === 'trial_outcome' && sub.trial_end_date) {
    return {
      ...base,
      kind: 'trial_outcome',
      date: sub.trial_end_date,
      amountCents: conversion?.expected_amount_cents ?? sub.amount_cents,
      chargeId: conversion?.id ?? null,
    };
  }
  if (question?.kind === 'cancel_confirmation' && sub.period_end_date) {
    return { ...base, kind: 'cancel_confirmation', date: sub.period_end_date, amountCents: sub.amount_cents, chargeId: null };
  }
  return null;
}

/** Questions à J+1 : issue d'un essai, confirmation d'une résiliation. */
export function homeQuestions(subs: readonly Subscription[], charges: readonly HomeChargeRow[], today: string): HomeQuestion[] {
  return subs.map((sub) => questionFor(sub, charges, today)).filter((q): q is HomeQuestion => q !== null);
}
