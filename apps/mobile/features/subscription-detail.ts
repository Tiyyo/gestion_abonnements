import { forgottenTrialRisk, type LifecycleAction, todayIn } from '@abonnements/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { archiveSubscription, transitionSubscription } from '../db/commands';
import { newId } from '../db/id';
import { useDb } from '../db/provider';
import { loadLedger } from '../db/repositories/ledger';
import { subscriptionsRepository } from '../db/repositories/subscriptions';
import { subscriptionsKey } from './subscriptions';

export function useSubscriptionDetail(id: string) {
  const db = useDb();
  return useQuery({
    queryKey: [...subscriptionsKey, id, 'detail'],
    queryFn: async () => {
      const today = todayIn();
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
        db.selectFrom('event').selectAll().where('subscription_id', '=', id).orderBy('occurred_on', 'desc').orderBy('created_at', 'desc').execute(),
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
        db
          .selectFrom('scheduled_notification')
          .selectAll()
          .where('ref_id', '=', id)
          .where('fire_at', '<=', `${today}T23:59`)
          .execute(),
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
      const provisionedCents = provisions
        .filter((p) => !lastPaid?.actual_date || p.due_date > lastPaid.actual_date)
        .reduce((total, p) => total + p.funded_amount_cents, 0);
      const history = [
        ...events.map((e) => ({ id: e.id, date: e.occurred_on, sort: e.created_at, kind: 'event' as const, event: e })),
        ...reminders
          .filter((r) => r.fire_at <= `${today}T${new Date().toTimeString().slice(0, 5)}`)
          .map((r) => ({ id: r.id, date: r.fire_at.slice(0, 10), sort: r.fire_at, kind: 'reminder' as const, reminder: r })),
      ].sort((a, b) => (a.date === b.date ? b.sort.localeCompare(a.sort) : b.date.localeCompare(a.date)));
      return { row, settings, nextCharge: nextCharge ?? null, history, provisionedCents, trialRisk, today };
    },
  });
}

function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([subscriptionsKey, ['plan'], ['home'], ['charges'], ['stats']].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

export function useSubscriptionTransition(id: string) {
  const db = useDb();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (action: LifecycleAction) => transitionSubscription(db, id, action, todayIn(), newId),
    onSuccess: invalidate,
  });
}

export function useArchiveSubscription(id: string) {
  const db = useDb();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: () => archiveSubscription(db, id, todayIn(), newId),
    onSuccess: invalidate,
  });
}

export function useSubscriptionTransitionFor() {
  const db = useDb();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ subscriptionId, action }: { subscriptionId: string; action: LifecycleAction }) =>
      transitionSubscription(db, subscriptionId, action, todayIn(), newId),
    onSuccess: invalidate,
  });
}
