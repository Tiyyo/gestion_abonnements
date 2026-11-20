import type { useChargeToReview } from './hooks/use-charge-to-review';
import type { useFollowUp } from './hooks/use-follow-up';
import type { useReviewCharge } from './hooks/use-review-charge';

/** Prélèvement à rapprocher, avec le nom et le statut de son abonnement. */
export type ChargeToReview = NonNullable<ReturnType<typeof useChargeToReview>['data']>;

/** Ce dont les étapes du rapprochement ont besoin : le prélèvement, les deux mutations et l'affichage d'erreur. */
export interface ReviewContext {
  row: ChargeToReview;
  review: ReturnType<typeof useReviewCharge>;
  followUp: ReturnType<typeof useFollowUp>;
  fail: (error: Error) => void;
}
