import { XStack, YStack } from 'tamagui';
import { ONBOARDING_STEPS } from '@/features/settings/onboarding-steps';
import { Overline, ScreenTitle } from '@/ui/text/typography';

/** Avancement du premier lancement, sur le dégradé : segments pêche pour les étapes atteintes, verre pour les suivantes. */
export function OnboardingProgress({ step }: { step: number }) {
  return (
    // Région vivante : « Étape 2 sur 3, Marge » est annoncé quand on passe à l'étape suivante, le focus restant sur « Continuer ».
    <YStack px="4" gap="1" accessibilityLiveRegion="polite">
      <XStack gap="1.5" mb="3" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {ONBOARDING_STEPS.map((label, i) => (
          <YStack key={label} flex={1} h={4} rounded="full" bg={i <= step ? 'secondary' : 'glassFill'} transition="smooth" />
        ))}
      </XStack>
      <Overline color="onGlassMuted">{`Étape ${step + 1} sur ${ONBOARDING_STEPS.length}`}</Overline>
      <ScreenTitle color="onGlass" accessibilityRole="header">
        {ONBOARDING_STEPS[step]}
      </ScreenTitle>
    </YStack>
  );
}
