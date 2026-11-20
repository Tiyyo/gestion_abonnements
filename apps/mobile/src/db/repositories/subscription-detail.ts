import { forgottenTrialRisk } from '@abonnements/core';
import type { Kysely } from 'kysely';
import type { DB } from '@/db/types';
import { loadLedger } from './ledger';
import { subscriptionsRepository } from './subscriptions';

/** Lectures de la fiche d’un abonnement : ligne, réglages, prochain prélèvement, événements, rappels passés, provisions, risque d’essai. */
export async function subscriptionDetailRows(db: Kysely<DB>, id: string, today: string) {
  const row = await subscriptionsRepository(db).get(id);
  if (!row) {
    return null;
  }
  const [settings, nextCharge, events, conversion] = await Promise.all([
    db.selectFrom('settings').selectAll().executeTakeFirstOrThrow(),
    db
      .selectFrom('v_upcoming_charge')
      .selectAll()
      .where('subscription_id', '=', id)
      .where('due_date', '>=', today)
      .orderBy('due_date')
      .executeTakeFirst(),
    db
      .selectFrom('event')
      .selectAll()
      .where('subscription_id', '=', id)
      .orderBy('occurred_on', 'desc')
      .orderBy('created_at', 'desc')
      .execute(),
    db.selectFrom('charge').selectAll().where('subscription_id', '=', id).where('is_trial_conversion', '=', 1).executeTakeFirst(),
  ]);
  const trialRisk =
    row.status === 'trial' && conversion
      ? forgottenTrialRisk(await loadLedger(db), today, {
          status: conversion.status,
          dueDate: conversion.due_date,
          fundedAmountCents: conversion.funded_amount_cents,
          expectedAmountCents: conversion.expected_amount_cents,
          actualAmountCents: conversion.actual_amount_cents,
          actualDate: conversion.actual_date,
          provisionOnly: false,
        })
      : false;
  const [reminders, provisions, lastPaid] = await Promise.all([
    db.selectFrom('scheduled_notification').selectAll().where('ref_id', '=', id).where('fire_at', '<=', `${today}T23:59`).execute(),
    db
      .selectFrom('charge')
      .select(['due_date', 'funded_amount_cents'])
      .where('subscription_id', '=', id)
      .where('provision_only', '=', 1)
      .where('status', '=', 'funded')
      .execute(),
    db
      .selectFrom('charge')
      .select('actual_date')
      .where('subscription_id', '=', id)
      .where('provision_only', '=', 0)
      .where('status', '=', 'paid')
      .orderBy('actual_date', 'desc')
      .executeTakeFirst(),
  ]);
  return {
    row,
    settings,
    nextCharge: nextCharge ?? null,
    events,
    reminders,
    provisions,
    lastPaidDate: lastPaid?.actual_date ?? null,
    trialRisk,
  };
}
