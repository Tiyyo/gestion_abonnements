import { useState } from 'react';
import { defaultDebitDate, isValidAmountInput } from '@/features/charges/debit-input';
import type { ChargeToReview } from '@/features/charges/types';
import { centsToInput, parseAmountCents } from '@/features/subscriptions/subscription-form-schema';

/** Saisie du rapprochement, initialisée depuis le prélèvement (le parent remonte le formulaire par `key` à chaque prélèvement). */
export function useReviewForm(row: ChargeToReview, today: string) {
  const [amount, setAmount] = useState(() => centsToInput(row.expected_amount_cents));
  const [date, setDate] = useState(() => defaultDebitDate(row.due_date, today));
  const validAmount = isValidAmountInput(amount);
  return { amount, setAmount, date, setDate, validAmount, amountCents: validAmount ? parseAmountCents(amount) : 0 };
}
