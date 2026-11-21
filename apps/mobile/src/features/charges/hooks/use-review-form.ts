import { useState } from 'react';
import { defaultDebitDate, isReviewDirty, isValidAmountInput } from '@/features/charges/debit-input';
import type { ChargeToReview } from '@/features/charges/types';
import { centsToInput, parseAmountCents } from '@/features/subscriptions/subscription-form-schema';

/**
 * Saisie du rapprochement, initialisée depuis le débit vu par la banque s'il y en a un, sinon depuis le prélèvement
 * (le parent remonte le formulaire par `key` à chaque prélèvement).
 */
export function useReviewForm(row: ChargeToReview, today: string) {
  const seen = row.bankHint?.kind === 'debit' ? row.bankHint : null;
  const [initial] = useState(() => ({
    amount: centsToInput(seen?.amountCents ?? row.expected_amount_cents),
    date: defaultDebitDate(seen?.date ?? row.due_date, today),
  }));
  const [amount, setAmount] = useState(initial.amount);
  const [date, setDate] = useState(initial.date);
  const validAmount = isValidAmountInput(amount);
  const dirty = isReviewDirty({ amount, date }, initial);
  return { amount, setAmount, date, setDate, validAmount, dirty, amountCents: validAmount ? parseAmountCents(amount) : 0 };
}
