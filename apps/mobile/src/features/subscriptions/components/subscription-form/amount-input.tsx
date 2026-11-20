import { type Control, Controller } from 'react-hook-form';
import { TextInput } from 'react-native';
import { Text, XStack } from 'tamagui';
import type { SubscriptionFormValues } from '@/features/subscriptions/subscription-form-schema';
import { colors } from '@/theme/colors';
import { formStyles } from './form-styles';

interface Props {
  control: Control<SubscriptionFormValues>;
  trial: boolean;
  hasAmount: boolean;
}

export function AmountInput({ control, trial, hasAmount }: Props) {
  return (
    <XStack items="baseline" gap="1">
      <Controller
        control={control}
        name="amount"
        render={({ field }) => (
          <TextInput
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholder="0,00"
            placeholderTextColor={colors.onGlassMuted}
            cursorColor={colors.onGlass}
            selectionColor={colors.onGlassMuted}
            keyboardType="decimal-pad"
            textAlign="right"
            style={formStyles.amount}
            accessibilityLabel={trial ? 'Montant après l’essai, en euros' : 'Montant en euros'}
          />
        )}
      />
      <Text style={formStyles.currency} color={hasAmount ? 'onGlass' : 'onGlassMuted'}>
        €
      </Text>
    </XStack>
  );
}
