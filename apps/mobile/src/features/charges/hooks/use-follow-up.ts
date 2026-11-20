import { todayIn } from '@abonnements/core';
import { useMutation } from '@tanstack/react-query';
import { newId } from '@/db/id';
import { useDb } from '@/db/provider';
import { confirmCancellation } from '@/db/reconcile/confirm-cancellation';
import { correctiveTransfer } from '@/db/reconcile/corrective-transfer';
import { decideAfterPaidTrial } from '@/db/reconcile/decide-after-paid-trial';
import { updateSubscriptionAmount } from '@/db/reconcile/update-subscription-amount';
import { useInvalidateAll } from '@/features/home/hooks/use-invalidate-all';

export type FollowUpInput =
  | { type: 'keep' | 'cancel'; subscriptionId: string }
  | { type: 'amount'; subscriptionId: string; amountCents: number }
  | { type: 'confirm_cancel'; subscriptionId: string }
  | { type: 'corrective'; chargeId: string; amountCents: number };

export function useFollowUp() {
  const db = useDb();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: FollowUpInput) => {
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
