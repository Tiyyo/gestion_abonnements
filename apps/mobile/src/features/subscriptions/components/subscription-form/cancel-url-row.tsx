import { Link } from 'lucide-react-native';
import { type Control, Controller } from 'react-hook-form';
import { TextInput } from 'react-native';
import { YStack } from 'tamagui';
import type { SubscriptionFormValues } from '@/features/subscriptions/subscription-form-schema';
import { useColors } from '@/theme/use-colors';
import { Caption } from '@/ui/text/typography';
import { FieldError } from './field-error';
import { FormRow } from './form-row';
import { formStyles } from './form-styles';

export function CancelUrlRow({ control, error }: { control: Control<SubscriptionFormValues>; error?: string }) {
  const colors = useColors();
  return (
    <FormRow icon={Link}>
      <YStack flex={1} gap="0.5">
        <Caption>Lien de résiliation</Caption>
        <Controller
          control={control}
          name="cancelUrl"
          render={({ field }) => (
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder="https://…"
              placeholderTextColor={colors.muted}
              cursorColor={colors.primaryText}
              autoCapitalize="none"
              keyboardType="url"
              style={[formStyles.inline, { color: colors.text }]}
              accessibilityLabel="Lien de résiliation"
            />
          )}
        />
        <FieldError message={error} />
      </YStack>
    </FormRow>
  );
}
