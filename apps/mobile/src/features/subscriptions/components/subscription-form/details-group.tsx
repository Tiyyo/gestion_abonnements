import { CalendarDays, Repeat, Tag } from 'lucide-react-native';
import type { PeriodicityKey } from '@/features/subscriptions/subscription-form-schema';
import { formatDateFr } from '@/lib/format';
import { dateLabel, periodicityLabel, type SheetKind } from './form-labels';
import { FormGroup } from '@/ui/surfaces/form-group';
import { PickerRow } from '@/ui/controls/picker-row';

interface Props {
  categoryName: string;
  periodicity: PeriodicityKey;
  status: string;
  firstChargeDate: string;
  onOpen: (kind: SheetKind) => void;
  onPickDate: () => void;
}

/** Catégorie, périodicité et date ; un abonnement résilié n'a plus de date à choisir. */
export function DetailsGroup({ categoryName, periodicity, status, firstChargeDate, onOpen, onPickDate }: Props) {
  return (
    <FormGroup title="Détails">
      <PickerRow icon={Tag} label="Catégorie" value={categoryName} onPress={() => onOpen('category')} />
      <PickerRow
        icon={Repeat}
        label="Périodicité"
        value={periodicityLabel(periodicity)}
        onPress={() => onOpen('periodicity')}
        last={status === 'cancelled'}
      />
      {status !== 'cancelled' ? (
        <PickerRow icon={CalendarDays} label={dateLabel(status)} value={formatDateFr(firstChargeDate)} onPress={onPickDate} last />
      ) : null}
    </FormGroup>
  );
}
