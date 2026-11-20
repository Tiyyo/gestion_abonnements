import { XStack, YStack } from 'tamagui';
import { ONBOARDING_STEPS } from '@/features/settings/onboarding-steps';
import { Overline, ScreenTitle } from '@/ui/text/typography';

export function OnboardingProgress({ step }: { step: number }) {
  return (
    <YStack px="4" gap="1">
      <XStack gap="1.5" mb="3" accessibilityElementsHidden>
        {ONBOARDING_STEPS.map((label, i) => (
          <YStack key={label} flex={1} h={4} rounded="full" bg={i <= step ? 'primary' : 'subtle'} />
        ))}
      </XStack>
      <Overline>{`Étape ${step + 1} sur ${ONBOARDING_STEPS.length}`}</Overline>
      <ScreenTitle>{ONBOARDING_STEPS[step]}</ScreenTitle>
    </YStack>
  );
}
