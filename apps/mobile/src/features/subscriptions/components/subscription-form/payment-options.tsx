import type { PaymentMethod } from '@abonnements/core';
import { SheetOption } from '@/ui/feedback/sheet-option';
import { PAYMENT_METHODS } from './form-labels';

export function PaymentOptions({ selected, onSelect }: { selected: PaymentMethod; onSelect: (method: PaymentMethod) => void }) {
  return PAYMENT_METHODS.map((m, i) => (
    <SheetOption
      key={m.key}
      label={m.label}
      hint={m.hint}
      selected={selected === m.key}
      last={i === PAYMENT_METHODS.length - 1}
      onPress={() => onSelect(m.key)}
    />
  ));
}
