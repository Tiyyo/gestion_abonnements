import { CreditCard } from 'lucide-react-native';
import type { Control, FieldErrors } from 'react-hook-form';
import type { SubscriptionFormValues } from '@/features/subscriptions/subscription-form-schema';
import { CancelUrlRow } from './cancel-url-row';
import { paymentLabel } from './form-labels';
import { FormGroup } from '@/ui/surfaces/form-group';
import { MarginRow } from './margin-row';
import { NotesRow } from './notes-row';
import { PickerRow } from '@/ui/controls/picker-row';

interface Props {
  control: Control<SubscriptionFormValues>;
  errors: FieldErrors<SubscriptionFormValues>;
  paymentMethod: string;
  marginOverrideBp: number | null;
  globalMarginBp: number;
  onOpenPayment: () => void;
  onMarginChange: (marginBp: number | null) => void;
}

/** Réglages avancés, proposés seulement en modification. */
export function OptionsGroup({ control, errors, paymentMethod, marginOverrideBp, globalMarginBp, onOpenPayment, onMarginChange }: Props) {
  return (
    <FormGroup title="Options">
      <PickerRow
        icon={CreditCard}
        label="Paiement"
        value={paymentLabel(paymentMethod)}
        onPress={onOpenPayment}
        testID="subscription-form.payment"
      />
      <MarginRow overrideBp={marginOverrideBp} globalMarginBp={globalMarginBp} onChange={onMarginChange} />
      <CancelUrlRow control={control} error={errors.cancelUrl?.message} />
      <NotesRow control={control} error={errors.notes?.message} />
    </FormGroup>
  );
}
