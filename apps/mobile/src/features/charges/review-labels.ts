import { formatEuros } from '@abonnements/core';

interface ReviewedCharge {
  status: string;
  expected_amount_cents: number;
  funded_amount_cents: number;
}

const isUnfunded = (row: Pick<ReviewedCharge, 'status'>) => row.status === 'unfunded';

/** Ce que Sluis attendait de ce prélèvement, au-dessus de l'aperçu. */
export function reviewIntro(row: ReviewedCharge): string {
  return isUnfunded(row)
    ? 'Ce prélèvement n’était pas financé : il a normalement échoué. Vérifie ton relevé Revolut.'
    : `Attendu ${formatEuros(row.expected_amount_cents)}, financé ${formatEuros(row.funded_amount_cents)}. Vérifie ton relevé Revolut.`;
}

/** Ce que représente le montant saisi : pour un prélèvement financé, il sert aussi de nouveau prix s'il a échoué. */
export function reviewAmountHint(row: Pick<ReviewedCharge, 'status'>): string {
  return isUnfunded(row) ? 'Le montant réellement débité.' : 'Le montant réellement débité, ou le nouveau prix s’il a changé.';
}

export interface ReviewOutcome {
  answer: 'paid' | 'failed';
  title: string;
  detail: string;
}

/** Ce que déclenche chaque réponse (features/charges/review-flows), dans l'ordre des boutons lus de droite à gauche. */
export function reviewOutcomes(row: Pick<ReviewedCharge, 'status'>): ReviewOutcome[] {
  return [
    { answer: 'paid', title: 'Il est passé', detail: 'Le débit est enregistré avec ce montant et cette date.' },
    {
      answer: 'failed',
      title: 'Il a échoué',
      detail: isUnfunded(row)
        ? 'Rien n’a été débité : le prélèvement est classé.'
        : 'L’argent transféré est resté sur le compte. Sluis demande si le marchand va retenter.',
    },
  ];
}
