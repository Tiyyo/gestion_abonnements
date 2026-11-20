import type { Control, FieldErrors } from 'react-hook-form';
import { YStack } from 'tamagui';
import type { SubscriptionFormValues } from '@/features/subscriptions/subscription-form-schema';
import { GlassCard } from '@/ui/surfaces/glass-card';
import { Hero } from '@/ui/surfaces/hero';
import { Caption } from '@/ui/text/typography';
import { AmountInput } from './amount-input';
import { FieldError } from './field-error';
import { logoLabel } from './form-labels';
import { LogoButton } from './logo-button';
import { NameInput } from './name-input';

interface Props {
  control: Control<SubscriptionFormValues>;
  errors: FieldErrors<SubscriptionFormValues>;
  name: string;
  iconKey: string | null;
  caption: string;
  trial: boolean;
  onLogo: () => void;
  onLookup: (name: string) => void;
}

/** Aperçu vivant sur le dégradé : logo, nom, catégorie et rythme, montant. */
export function FormHero({ control, errors, name, iconKey, caption, trial, onLogo, onLookup }: Props) {
  return (
    <Hero px="4" pt="2" pb="5">
      <GlassCard flexDirection="row" items="center" gap="3" p="3.5">
        <LogoButton name={name} iconKey={iconKey} label={logoLabel(iconKey, name)} onPress={onLogo} />
        <YStack flex={1} minW={0}>
          <NameInput control={control} onLookup={onLookup} />
          <Caption color="onGlassMuted" numberOfLines={2}>
            {caption}
          </Caption>
        </YStack>
        <AmountInput control={control} trial={trial} />
      </GlassCard>
      {errors.name?.message || errors.amount?.message ? (
        <YStack pt="2" px="1">
          <FieldError onGlass message={errors.name?.message} />
          <FieldError onGlass message={errors.amount?.message} />
        </YStack>
      ) : null}
    </Hero>
  );
}
