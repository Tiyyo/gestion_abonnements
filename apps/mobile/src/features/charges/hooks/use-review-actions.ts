import { submitFailed, submitPaid } from '@/features/charges/review-flows';
import type { ChargeToReview } from '@/features/charges/types';
import { useFollowUp } from './use-follow-up';
import { useReviewCharge } from './use-review-charge';
import { showError } from '@/ui/feedback/show-dialog';

/** Réponses « Il est passé » / « Il a échoué » du rapprochement d'un prélèvement. */
export function useReviewActions(row: ChargeToReview) {
  const review = useReviewCharge();
  const followUp = useFollowUp();
  const ctx = { row, review, followUp, fail: (error: Error) => showError('Action impossible', error.message) };
  return {
    busy: review.isPending || followUp.isPending,
    paid: (amountCents: number, date: string) => submitPaid(ctx, amountCents, date),
    failed: (newAmountCents: number) => submitFailed(ctx, newAmountCents),
  };
}
