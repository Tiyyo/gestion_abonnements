import { useState } from 'react';
import { isUnknownDebitDirty, isValidAmountInput } from '@/features/charges/debit-input';

/** Valeurs de départ quand la feuille s'ouvre depuis un débit lu sur le compte (carte « Débit non prévu détecté »). */
export interface UnknownDebitPrefill {
  name?: string;
  amount?: string;
  date?: string;
}

export function useUnknownDebitForm(today: string, prefill: UnknownDebitPrefill = {}) {
  // Valeurs proposées à l'ouverture, figées : un débit prérempli ou un changement de jour ne compte pas comme une saisie.
  const [initial] = useState(() => ({
    name: prefill.name ?? '',
    amount: prefill.amount ?? '',
    date: prefill.date && prefill.date <= today ? prefill.date : today,
  }));
  const [name, setName] = useState(initial.name);
  const [amount, setAmount] = useState(initial.amount);
  const [date, setDate] = useState(initial.date);
  const valid = name.trim().length > 0 && isValidAmountInput(amount);
  const dirty = isUnknownDebitDirty({ name, amount, date }, initial);
  return { name, setName, amount, setAmount, date, setDate, valid, dirty };
}

export type UnknownDebitForm = ReturnType<typeof useUnknownDebitForm>;
