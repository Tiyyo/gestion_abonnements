import { type Control, Controller } from 'react-hook-form';
import type { SubscriptionFormValues } from '@/features/subscriptions/subscription-form-schema';
import { GlassTextInput } from '@/ui/controls/glass-text-input';

/** Nom de l'abonnement ; quitter le champ lance tout de suite la recherche de suggestion. */
export function NameInput({ control, onLookup }: { control: Control<SubscriptionFormValues>; onLookup: (name: string) => void }) {
  return (
    <Controller
      control={control}
      name="name"
      render={({ field }) => (
        <GlassTextInput
          value={field.value}
          onChangeText={field.onChange}
          onBlur={() => {
            field.onBlur();
            onLookup(field.value);
          }}
          placeholder="Nom"
          autoCapitalize="words"
          returnKeyType="next"
          accessibilityLabel="Nom de l’abonnement"
        />
      )}
    />
  );
}
