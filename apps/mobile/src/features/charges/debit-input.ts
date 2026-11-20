import { parseAmountCents } from '@/features/subscriptions/subscription-form-schema';

const AMOUNT = /^\d{1,6}([.,]\d{1,2})?$/;

/** Montant saisi en euros (« 9,99 », « 12.5 »), strictement positif. */
export function isValidAmountInput(value: string): boolean {
  return AMOUNT.test(value.trim()) && parseAmountCents(value) > 0;
}

/** Date du débit proposée : la date prévue si elle est passée, sinon aujourd'hui (un débit n'est jamais dans le futur). */
export function defaultDebitDate(dueDate: string, today: string): string {
  return dueDate < today ? dueDate : today;
}

/** Complément à transférer quand le marchand retente avec un prix plus élevé que le montant financé, sinon `null`. */
export function retryShortfallCents(newAmountCents: number, fundedCents: number): number | null {
  return newAmountCents > fundedCents ? newAmountCents - fundedCents : null;
}

const EVENT_LABELS = {
  unexpected_charge: 'Prélèvement inattendu enregistré.',
  post_cancel_charge: 'Prélèvement après résiliation enregistré. Réclame un remboursement au marchand.',
  duplicate: 'Double prélèvement enregistré. Réclame un remboursement au marchand.',
} as const;

/** Message de confirmation d'un débit inconnu enregistré, selon son classement. */
export function unknownDebitLabel(type: string): string {
  return EVENT_LABELS[type as keyof typeof EVENT_LABELS] ?? 'Débit enregistré.';
}
