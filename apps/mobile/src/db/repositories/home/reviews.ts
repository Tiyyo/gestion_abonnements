import { needsReview } from '@abonnements/core';
import { isPostponed } from '@/db/reconcile/retry-note';
import { type BankContext, bankHintFor } from '@/db/repositories/bank-transactions';
import type { HomeChargeRow, HomeQuestion, HomeReview } from './types';

/**
 * Prélèvements à rapprocher, hors ceux déjà couverts par une question et ceux reportés.
 * Un prélèvement pour lequel la banque montre un débit est à vérifier tout de suite, même avant sa date ou reporté.
 */
export function chargesToReview(
  charges: readonly HomeChargeRow[],
  questions: readonly HomeQuestion[],
  notePayloads: readonly string[],
  today: string,
  bank: BankContext,
): HomeReview[] {
  const askedCharges = new Set(questions.map((q) => q.chargeId));
  return charges
    .filter(
      (c) =>
        !askedCharges.has(c.id) &&
        (bank.suggestions.has(c.id) ||
          (!isPostponed(notePayloads, c.id, today) &&
            needsReview(
              {
                id: c.id,
                subscriptionId: c.subscription_id,
                dueDate: c.due_date,
                status: c.status,
                expectedAmountCents: c.expected_amount_cents,
                fundedAmountCents: c.funded_amount_cents,
                provisionOnly: false,
              },
              today,
            ))),
    )
    .map((c) => ({
      chargeId: c.id,
      subscriptionId: c.subscription_id,
      name: c.name,
      dueDate: c.due_date,
      expectedAmountCents: c.expected_amount_cents,
      wanted: c.status !== 'unfunded',
      bank: bankHintFor(bank, c),
    }));
}
