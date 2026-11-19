import { todayIn } from '@abonnements/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { newId } from '../db/id';
import { useDb } from '../db/provider';
import {
  confirmCancellation,
  correctiveTransfer,
  decideAfterPaidTrial,
  type ReviewAnswer,
  reviewCharge,
  runDailyMaintenance,
  updateSubscriptionAmount,
} from '../db/reconcile';
import { loadHome } from '../db/repositories/home';
import { subscriptionsKey } from './subscriptions';

const ALL_KEYS = [subscriptionsKey, ['plan'], ['home'], ['charges'], ['stats']];

function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => Promise.all(ALL_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

export function useHome() {
  const db = useDb();
  return useQuery({ queryKey: ['home'], queryFn: () => loadHome(db, todayIn()) });
}

let maintenanceDay: string | null = null;

export function useDailyMaintenance() {
  const db = useDb();
  const invalidate = useInvalidateAll();
  useEffect(() => {
    const today = todayIn();
    if (maintenanceDay === today) {
      return;
    }
    maintenanceDay = today;
    runDailyMaintenance(db, today, newId)
      .then((changed) => (changed > 0 ? invalidate() : undefined))
      .catch(() => {
        maintenanceDay = null;
      });
  });
}

export function useChargeToReview(chargeId: string) {
  const db = useDb();
  return useQuery({
    queryKey: ['charges', chargeId, 'review'],
    queryFn: () =>
      db
        .selectFrom('charge')
        .innerJoin('subscription', 'subscription.id', 'charge.subscription_id')
        .selectAll('charge')
        .select(['subscription.name', 'subscription.status as subscription_status'])
        .where('charge.id', '=', chargeId)
        .executeTakeFirst()
        .then((row) => row ?? null),
  });
}

export function useReviewCharge() {
  const db = useDb();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ chargeId, answer }: { chargeId: string; answer: ReviewAnswer }) => reviewCharge(db, chargeId, answer, todayIn(), newId),
    onSuccess: invalidate,
  });
}

export function useFollowUp() {
  const db = useDb();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (
      input:
        | { type: 'keep' | 'cancel'; subscriptionId: string }
        | { type: 'amount'; subscriptionId: string; amountCents: number }
        | { type: 'confirm_cancel'; subscriptionId: string }
        | { type: 'corrective'; chargeId: string; amountCents: number },
    ) => {
      const today = todayIn();
      switch (input.type) {
        case 'keep':
        case 'cancel':
          return decideAfterPaidTrial(db, input.subscriptionId, input.type, today, newId);
        case 'amount':
          return updateSubscriptionAmount(db, input.subscriptionId, input.amountCents, today, newId);
        case 'confirm_cancel':
          return confirmCancellation(db, input.subscriptionId, today, newId);
        case 'corrective':
          return correctiveTransfer(db, input.chargeId, input.amountCents, today, newId).then(() => undefined);
      }
    },
    onSuccess: invalidate,
  });
}
