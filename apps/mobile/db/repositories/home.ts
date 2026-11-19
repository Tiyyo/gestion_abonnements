import { compareDates, needsReview, pendingQuestion } from '@abonnements/core';
import type { Kysely } from 'kysely';
import { isPostponed, RETRY_NOTE } from '../reconcile';
import { toSnapshot } from '../sync';
import type { DB } from '../types';
import { loadLedger } from './ledger';
import { loadTrials, loadVaultTransfers, type PlanTransfer, type PlanTrial } from './plan';

export interface HomeQuestion {
  kind: 'trial_outcome' | 'cancel_confirmation';
  subscriptionId: string;
  name: string;
  date: string;
  amountCents: number;
  chargeId: string | null;
  cancelUrl: string | null;
}

export interface HomeReview {
  chargeId: string;
  subscriptionId: string;
  name: string;
  dueDate: string;
  expectedAmountCents: number;
  wanted: boolean;
}

export interface HomeUpcoming {
  chargeId: string;
  subscriptionId: string;
  name: string;
  dueDate: string;
  amountCents: number;
  fundedAmountCents: number;
  transferDate: string | null;
  funded: boolean;
}

export interface HomeData {
  overdue: PlanTransfer[];
  next: PlanTransfer | null;
  questions: HomeQuestion[];
  trials: PlanTrial[];
  toReview: HomeReview[];
  upcoming: HomeUpcoming[];
  isEmpty: boolean;
}

export async function loadHome(db: Kysely<DB>, today: string): Promise<HomeData> {
  const settings = await db.selectFrom('settings').selectAll().executeTakeFirstOrThrow();
  const [transfers, subs, charges, notes, ledger] = await Promise.all([
    loadVaultTransfers(db, settings.global_margin_bp, (t) => t.status === 'planned'),
    db.selectFrom('subscription').selectAll().where('archived_at', 'is', null).execute(),
    db
      .selectFrom('charge')
      .innerJoin('subscription', 'subscription.id', 'charge.subscription_id')
      .selectAll('charge')
      .select(['subscription.name', 'subscription.status as subscription_status'])
      .where('subscription.archived_at', 'is', null)
      .where('charge.provision_only', '=', 0)
      .where('charge.status', 'in', ['planned', 'funded', 'unfunded'])
      .orderBy('charge.due_date')
      .execute(),
    db.selectFrom('event').select('payload').where('type', '=', 'note').where('payload', 'like', `%${RETRY_NOTE}%`).execute(),
    loadLedger(db),
  ]);

  const overdue = transfers.filter((t) => compareDates(t.effectiveDate, today) < 0);
  const next = transfers.find((t) => compareDates(t.effectiveDate, today) >= 0) ?? null;

  const questions: HomeQuestion[] = [];
  for (const sub of subs) {
    const conversion = charges.find((c) => c.subscription_id === sub.id && c.is_trial_conversion === 1);
    const question = pendingQuestion({ ...toSnapshot(sub), cancelDone: sub.cancel_done === 1 }, today, conversion?.status ?? null);
    if (question?.kind === 'trial_outcome' && sub.trial_end_date) {
      questions.push({
        kind: 'trial_outcome',
        subscriptionId: sub.id,
        name: sub.name,
        date: sub.trial_end_date,
        amountCents: conversion?.expected_amount_cents ?? sub.amount_cents,
        chargeId: conversion?.id ?? null,
        cancelUrl: sub.cancel_url,
      });
    } else if (question?.kind === 'cancel_confirmation' && sub.period_end_date) {
      questions.push({
        kind: 'cancel_confirmation',
        subscriptionId: sub.id,
        name: sub.name,
        date: sub.period_end_date,
        amountCents: sub.amount_cents,
        chargeId: null,
        cancelUrl: sub.cancel_url,
      });
    }
  }

  const askedCharges = new Set(questions.map((q) => q.chargeId));
  const payloads = notes.map((n) => n.payload);
  const toReview = charges
    .filter(
      (c) =>
        !askedCharges.has(c.id) &&
        needsReview(
          {
            id: c.id,
            subscriptionId: c.subscription_id,
            dueDate: c.due_date,
            status: c.status,
            expectedAmountCents: c.expected_amount_cents,
            fundedAmountCents: c.funded_amount_cents,
            provisionOnly: false,
          },
          today,
        ) &&
        !isPostponed(payloads, c.id, today),
    )
    .map((c) => ({
      chargeId: c.id,
      subscriptionId: c.subscription_id,
      name: c.name,
      dueDate: c.due_date,
      expectedAmountCents: c.expected_amount_cents,
      wanted: c.status !== 'unfunded',
    }));

  const transferByCharge = new Map<string, string>();
  for (const t of transfers) {
    for (const id of t.chargeIds) {
      transferByCharge.set(id, t.effectiveDate);
    }
  }
  const upcoming = charges
    .filter((c) => c.status !== 'unfunded' && compareDates(c.due_date, today) >= 0)
    .slice(0, 3)
    .map((c) => ({
      chargeId: c.id,
      subscriptionId: c.subscription_id,
      name: c.name,
      dueDate: c.due_date,
      amountCents: c.expected_amount_cents,
      fundedAmountCents: c.funded_amount_cents,
      transferDate: transferByCharge.get(c.id) ?? null,
      funded: c.status === 'funded',
    }));

  return {
    overdue,
    next,
    questions,
    trials: await loadTrials(db, today, ledger),
    toReview,
    upcoming,
    isEmpty: subs.length === 0,
  };
}
