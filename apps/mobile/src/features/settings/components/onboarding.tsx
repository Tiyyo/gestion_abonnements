import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, XStack } from 'tamagui';
import { useSettings } from '@/features/settings/hooks/use-settings';
import { useUpdateSettings } from '@/features/settings/hooks/use-update-settings';
import { ONBOARDING_STEPS } from '@/features/settings/onboarding-steps';
import { BrandMark } from '@/ui/brand/brand-mark';
import { ActionButton } from '@/ui/controls/action-button';
import { GlassCard } from '@/ui/surfaces/glass-card';
import { Hero } from '@/ui/surfaces/hero';
import { CardTitle } from '@/ui/text/typography';
import { OnboardingMarginStep } from './onboarding-margin-step';
import { OnboardingPaydayStep } from './onboarding-payday-step';
import { OnboardingProgress } from './onboarding-progress';
import { type NotificationRequest, OnboardingRemindersStep } from './onboarding-reminders-step';

/** Premier lancement, plein écran sur le dégradé : marque, avancement, étape dans une carte en verre, boutons en pilule. */
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
    <Hero flex={1} pt={insets.top + 24} pb={insets.bottom + 16} gap="5">
      <StatusBar style="light" />
      <XStack px="4" gap="2.5" items="center">
        <BrandMark size={36} />
        <CardTitle color="onGlass">Sluis</CardTitle>
      </XStack>
      <OnboardingProgress step={step} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <GlassCard gap="4">
          {step === 0 && <OnboardingPaydayStep value={paydayDay} onChange={setPayday} />}
          {step === 1 && <OnboardingMarginStep value={marginBp} onChange={setMargin} />}
          {step === 2 && <OnboardingRemindersStep notif={notif} setNotif={setNotif} />}
        </GlassCard>
      </ScrollView>

      <XStack px="4" gap="3">
        {step > 0 && <ActionButton flex={1} size="lg" label="Retour" variant="glass" onPress={() => setStep(step - 1)} />}
        <ActionButton
          flex={1}
          size="lg"
          label={lastStep ? 'Commencer' : 'Continuer'}
          variant="secondary"
          loading={update.isPending}
          onPress={() => (lastStep ? finish() : setStep(step + 1))}
        />
      </XStack>
    </Hero>
  );
}
