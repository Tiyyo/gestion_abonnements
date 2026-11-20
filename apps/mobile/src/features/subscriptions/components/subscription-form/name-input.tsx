import { type Control, Controller } from 'react-hook-form';
import { TextInput } from 'react-native';
import type { SubscriptionFormValues } from '@/features/subscriptions/subscription-form-schema';
import { colors } from '@/theme/colors';
import { formStyles } from './form-styles';

/** Nom de l'abonnement ; quitter le champ lance tout de suite la recherche de suggestion. */
export function NameInput({ control, onLookup }: { control: Control<SubscriptionFormValues>; onLookup: (name: string) => void }) {
  return (
    <Controller
      control={control}
      name="name"
      render={({ field }) => (
        <TextInput
          value={field.value}
          onChangeText={field.onChange}
          onBlur={() => {
            field.onBlur();
            onLookup(field.value);
          }}
          placeholder="Nom"
          placeholderTextColor={colors.onGlassMuted}
          cursorColor={colors.onGlass}
          selectionColor={colors.onGlassMuted}
          autoCapitalize="words"
          returnKeyType="next"
          style={formStyles.name}
          accessibilityLabel="Nom de l’abonnement"
        />
      )}
    />
  );
}
