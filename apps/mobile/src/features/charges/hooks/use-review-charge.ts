import { todayIn } from '@abonnements/core';
import { useMutation } from '@tanstack/react-query';
import { newId } from '@/db/id';
import { useDb } from '@/db/provider';
import { type ReviewAnswer, reviewCharge } from '@/db/reconcile/review-charge';
import { useInvalidateAll } from '@/features/home/hooks/use-invalidate-all';

export function useReviewCharge() {
  const db = useDb();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ chargeId, answer }: { chargeId: string; answer: ReviewAnswer }) => reviewCharge(db, chargeId, answer, todayIn(), newId),
    onSuccess: invalidate,
  });
}
