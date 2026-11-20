import type { useChargeToReview } from '@/features/charges/hooks/use-charge-to-review';
import type { useFollowUp } from '@/features/charges/hooks/use-follow-up';
import type { useReviewCharge } from '@/features/charges/hooks/use-review-charge';

/** Prélèvement à rapprocher, avec le nom et le statut de son abonnement. */
export type ChargeToReview = NonNullable<ReturnType<typeof useChargeToReview>['data']>;

/** Ce dont les étapes du rapprochement ont besoin : le prélèvement, les deux mutations, l'affichage d'erreur et la fermeture de l'écran. */
export interface ReviewContext {
  row: ChargeToReview;
  review: ReturnType<typeof useReviewCharge>;
  followUp: ReturnType<typeof useFollowUp>;
  fail: (error: Error) => void;
  /** Ferme l'écran une fois la réponse enregistrée, sans redemander confirmation pour la saisie. */
  close: () => void;
}
