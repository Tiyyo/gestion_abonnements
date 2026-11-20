import { useState } from 'react';
import { defaultDebitDate, isReviewDirty, isValidAmountInput } from '@/features/charges/debit-input';
import type { ChargeToReview } from '@/features/charges/types';
import { centsToInput, parseAmountCents } from '@/features/subscriptions/subscription-form-schema';

/** Saisie du rapprochement, initialisée depuis le prélèvement (le parent remonte le formulaire par `key` à chaque prélèvement). */
export function useReviewForm(row: ChargeToReview, today: string) {
  const [initial] = useState(() => ({ amount: centsToInput(row.expected_amount_cents), date: defaultDebitDate(row.due_date, today) }));
  const [amount, setAmount] = useState(initial.amount);
  const [date, setDate] = useState(initial.date);
  const validAmount = isValidAmountInput(amount);
  const dirty = isReviewDirty({ amount, date }, initial);
  return { amount, setAmount, date, setDate, validAmount, dirty, amountCents: validAmount ? parseAmountCents(amount) : 0 };
}
