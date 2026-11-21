import { PERIODICITIES, type PeriodicityKey } from '@/features/subscriptions/subscription-form-schema';
import { SheetOption } from '@/ui/feedback/sheet-option';

export function PeriodicityOptions({ selected, onSelect }: { selected: PeriodicityKey; onSelect: (key: PeriodicityKey) => void }) {
  return PERIODICITIES.map((p, i) => (
    <SheetOption
      key={p.key}
      label={p.label}
      selected={selected === p.key}
      last={i === PERIODICITIES.length - 1}
      onPress={() => onSelect(p.key)}
      testID={`subscription-form.periodicity-${p.key}`}
    />
  ));
}
