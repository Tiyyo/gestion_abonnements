import { useState } from 'react';
import { isValidAmountInput } from '@/features/charges/debit-input';

export function useUnknownDebitForm(today: string) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const valid = name.trim().length > 0 && isValidAmountInput(amount);
  return { name, setName, amount, setAmount, date, setDate, valid };
}

export type UnknownDebitForm = ReturnType<typeof useUnknownDebitForm>;
