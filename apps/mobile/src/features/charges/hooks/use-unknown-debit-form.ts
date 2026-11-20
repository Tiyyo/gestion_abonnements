import { useState } from 'react';
import { isUnknownDebitDirty, isValidAmountInput } from '@/features/charges/debit-input';

export function useUnknownDebitForm(today: string) {
  // Date proposée à l'ouverture : figée pour que la saisie ne paraisse pas modifiée si le jour change.
  const [initialDate] = useState(today);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(initialDate);
  const valid = name.trim().length > 0 && isValidAmountInput(amount);
  const dirty = isUnknownDebitDirty({ name, amount, date }, initialDate);
  return { name, setName, amount, setAmount, date, setDate, valid, dirty };
}

export type UnknownDebitForm = ReturnType<typeof useUnknownDebitForm>;
