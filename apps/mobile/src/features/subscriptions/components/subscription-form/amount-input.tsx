import { type Control, Controller } from 'react-hook-form';
import type { SubscriptionFormValues } from '@/features/subscriptions/subscription-form-schema';
import { GlassAmountInput } from '@/ui/controls/glass-amount-input';

export function AmountInput({ control, trial }: { control: Control<SubscriptionFormValues>; trial: boolean }) {
  return (
    <Controller
      control={control}
      name="amount"
      render={({ field }) => (
        <GlassAmountInput
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          accessibilityLabel={trial ? 'Montant après l’essai, en euros' : 'Montant en euros'}
          testID="subscription-form.amount"
        />
      )}
    />
  );
}
