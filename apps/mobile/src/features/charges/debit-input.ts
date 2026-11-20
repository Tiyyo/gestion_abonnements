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

/** Prélèvement inconnu : une saisie est en cours dès qu'un nom ou un montant est tapé, ou que la date proposée a changé. */
export function isUnknownDebitDirty(form: { name: string; amount: string; date: string }, initialDate: string): boolean {
  return form.name.trim() !== '' || form.amount.trim() !== '' || form.date !== initialDate;
}

/** Rapprochement : une saisie est en cours dès que le montant ou la date diffère de ce que l'écran proposait. */
export function isReviewDirty(form: { amount: string; date: string }, initial: { amount: string; date: string }): boolean {
  return form.amount.trim() !== initial.amount.trim() || form.date !== initial.date;
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
