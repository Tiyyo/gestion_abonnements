import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, XStack, YStack } from 'tamagui';
import { useSettings } from '@/features/settings/hooks/use-settings';
import { useUpdateSettings } from '@/features/settings/hooks/use-update-settings';
import { ONBOARDING_STEPS } from '@/features/settings/onboarding-steps';
import { ActionButton } from '@/ui/controls/action-button';
import { OnboardingMarginStep } from './onboarding-margin-step';
import { OnboardingPaydayStep } from './onboarding-payday-step';
import { OnboardingProgress } from './onboarding-progress';
import { type NotificationRequest, OnboardingRemindersStep } from './onboarding-reminders-step';

export function Onboarding() {
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const update = useUpdateSettings();
  const [step, setStep] = useState(0);
  const [payday, setPayday] = useState<number | null>(null);
  const [margin, setMargin] = useState<number | null>(null);
  const [notif, setNotif] = useState<NotificationRequest>('idle');

  const paydayDay = payday ?? settings.data?.payday_day ?? 1;
  const marginBp = margin ?? settings.data?.global_margin_bp ?? 300;
  const lastStep = step === ONBOARDING_STEPS.length - 1;

  const finish = () => update.mutate({ payday_day: paydayDay, global_margin_bp: marginBp, onboarding_done: 1 });

  return (
    <YStack flex={1} bg="background" pt={insets.top + 24} pb={insets.bottom + 16}>
      <OnboardingProgress step={step} />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {step === 0 && <OnboardingPaydayStep value={paydayDay} onChange={setPayday} />}
        {step === 1 && <OnboardingMarginStep value={marginBp} onChange={setMargin} />}
        {step === 2 && <OnboardingRemindersStep notif={notif} setNotif={setNotif} />}
      </ScrollView>

      <XStack px="4" gap="3">
        {step > 0 && <ActionButton flex={1} size="lg" label="Retour" variant="outline" onPress={() => setStep(step - 1)} />}
        <ActionButton
          flex={1}
          size="lg"
          label={lastStep ? 'Commencer' : 'Continuer'}
          loading={update.isPending}
          onPress={() => (lastStep ? finish() : setStep(step + 1))}
        />
      </XStack>
    </YStack>
  );
}
