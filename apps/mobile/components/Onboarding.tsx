import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';
import { useState } from 'react';
import { Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { ScrollView, XStack, YStack } from 'tamagui';
import { useSettings, useUpdateSettings } from '../features/settings';
import { requestNotifications } from '../notifications/scheduler';
import { ActionButton, Body, Caption, colors, Label, Overline, ScreenTitle } from '../ui/kit';
import { MarginStepper, PaydayGrid, paydayLabel } from './SettingsControls';

const STEPS = ['Jour de paie', 'Marge', 'Rappels'] as const;

export function Onboarding() {
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const update = useUpdateSettings();
  const [step, setStep] = useState(0);
  const [payday, setPayday] = useState<number | null>(null);
  const [margin, setMargin] = useState<number | null>(null);
  const [notif, setNotif] = useState<'idle' | 'ok' | 'refused'>('idle');

  const paydayDay = payday ?? settings.data?.payday_day ?? 1;
  const marginBp = margin ?? settings.data?.global_margin_bp ?? 300;
  const packageName = Constants.expoConfig?.android?.package ?? 'host.exp.exponent';
  const open = (action: IntentLauncher.ActivityAction, withPackage = false) =>
    IntentLauncher.startActivityAsync(action, withPackage ? { data: `package:${packageName}` } : undefined).catch(() =>
      Linking.openSettings(),
    );

  const finish = () => update.mutate({ payday_day: paydayDay, global_margin_bp: marginBp, onboarding_done: 1 });

  return (
    <YStack flex={1} bg="background" pt={insets.top + 24} pb={insets.bottom + 16}>
      <YStack px="4" gap="1">
        <XStack gap="1.5" mb="3" accessibilityElementsHidden>
          {STEPS.map((label, i) => (
            <YStack key={label} flex={1} h={4} rounded="full" bg={i <= step ? 'primary' : 'subtle'} />
          ))}
        </XStack>
        <Overline>{`Étape ${step + 1} sur ${STEPS.length}`}</Overline>
        <ScreenTitle>{STEPS[step]}</ScreenTitle>
      </YStack>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {step === 0 && (
          <>
            <Body>Le jour où ton salaire arrive. Chaque mois, l’app calcule ce qu’il faut mettre dans le coffre ce jour-là.</Body>
            <PaydayGrid value={paydayDay} onChange={setPayday} />
            <Caption>{`Virement de paie ${paydayLabel(paydayDay)}, reporté au jour ouvré suivant si besoin.`}</Caption>
          </>
        )}
        {step === 1 && (
          <>
            <Body>
              {
                'Chaque prélèvement est alimenté avec un peu plus que son montant, pour absorber une petite hausse de prix. 3\u202f% suffit en général, 5\u202f% au maximum.'
              }
            </Body>
            <MarginStepper value={marginBp} onChange={setMargin} />
          </>
        )}
        {step === 2 && (
          <>
            <Body>
              L’app te rappelle quand faire un transfert, quand un essai se termine et quand résilier. Les rappels restent sur le téléphone.
            </Body>
            {notif === 'ok' ? (
              <XStack minH={48} items="center" gap="2" px="3" bg="okBg" rounded="lg">
                <Check color={colors.ok} size={18} strokeWidth={2.5} />
                <Label color="okText">Notifications autorisées</Label>
              </XStack>
            ) : (
              <ActionButton
                size="lg"
                label="Autoriser les notifications"
                variant="secondary"
                onPress={() => requestNotifications().then((ok) => setNotif(ok ? 'ok' : 'refused'))}
              />
            )}
            {notif === 'refused' && <Body color="warnText">Refusé : tu pourras les autoriser plus tard dans les Réglages.</Body>}
            {Platform.OS === 'android' && Number(Platform.Version) >= 31 && (
              <ActionButton
                label="Autoriser les alarmes exactes"
                variant="outline"
                onPress={() => open(IntentLauncher.ActivityAction.REQUEST_SCHEDULE_EXACT_ALARM, true)}
              />
            )}
            <ActionButton
              label="Désactiver l’optimisation de la batterie"
              variant="outline"
              onPress={() => open(IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS)}
            />
            <Caption>Sur Xiaomi, autorise aussi le démarrage automatique de l’app, sinon les rappels peuvent être bloqués.</Caption>
          </>
        )}
      </ScrollView>

      <XStack px="4" gap="3">
        {step > 0 && <ActionButton flex={1} size="lg" label="Retour" variant="outline" onPress={() => setStep(step - 1)} />}
        <ActionButton
          flex={1}
          size="lg"
          label={step < STEPS.length - 1 ? 'Continuer' : 'Commencer'}
          loading={update.isPending}
          onPress={() => (step < STEPS.length - 1 ? setStep(step + 1) : finish())}
        />
      </XStack>
    </YStack>
  );
}
