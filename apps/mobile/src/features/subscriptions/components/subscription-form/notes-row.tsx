import { NotebookPen } from 'lucide-react-native';
import { type Control, Controller } from 'react-hook-form';
import { TextInput } from 'react-native';
import { YStack } from 'tamagui';
import type { SubscriptionFormValues } from '@/features/subscriptions/subscription-form-schema';
import { colors } from '@/theme/colors';
import { Caption } from '@/ui/text/typography';
import { FieldError } from './field-error';
import { FormRow } from './form-row';
import { formStyles } from './form-styles';

export function NotesRow({ control, error }: { control: Control<SubscriptionFormValues>; error?: string }) {
  return (
    <FormRow icon={NotebookPen} last>
      <YStack flex={1} gap="0.5">
        <Caption>Notes</Caption>
        <Controller
          control={control}
          name="notes"
          render={({ field }) => (
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder="Identifiant, offre, rappel…"
              placeholderTextColor={colors.muted}
              multiline
              style={[formStyles.inline, formStyles.notes]}
              accessibilityLabel="Notes"
            />
          )}
        />
        <FieldError message={error} />
      </YStack>
    </FormRow>
  );
}
