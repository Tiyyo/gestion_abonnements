import { type Control, Controller } from 'react-hook-form';
import type { SubscriptionFormValues } from '@/features/subscriptions/subscription-form-schema';
import { Segmented } from '@/ui/controls/segmented';

const STATUS_OPTIONS = [
  { key: 'trial', label: 'Période d’essai' },
  { key: 'active', label: 'Déjà actif' },
] as const;

export function StatusField({
  control,
  onChange,
}: {
  control: Control<SubscriptionFormValues>;
  onChange: (next: 'trial' | 'active') => void;
}) {
  return (
    <Controller
      control={control}
      name="status"
      render={({ field }) => <Segmented label="Statut" value={field.value} onChange={onChange} options={STATUS_OPTIONS} />}
    />
  );
}
