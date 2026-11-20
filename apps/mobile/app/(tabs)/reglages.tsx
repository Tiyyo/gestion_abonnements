import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as Battery from 'expo-battery';
import Constants from 'expo-constants';
import { useIsFocused } from 'expo-router';
import * as IntentLauncher from 'expo-intent-launcher';
import { type ReactNode, useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BellRing, ChevronDown, CircleAlert, CircleCheck, CircleMinus, Landmark, type LucideIcon, Sparkles } from 'lucide-react-native';
import { ScrollView, Spinner, XStack, YStack } from 'tamagui';
import { authenticate, biometricAvailable } from '../../components/LockGate';
import {
  MarginStepper,
  marginLabel,
  PaydayGrid,
  paydayLabel,
  parseDays,
  ReminderChips,
  reminderLabel,
} from '../../components/SettingsControls';
import { ImportError } from '../../db/backup';
import { useBackup } from '../../features/backup';
import { useBalances } from '../../features/balances';
import { readEnrichConfig } from '../../features/enrich';
import { readBalancesConfig } from '../../features/function-config';
import { useSettings, useUpdateSettings } from '../../features/settings';
import { notificationsAllowed, requestNotifications, requestReschedule } from '../../notifications/scheduler';
import { Chip } from '../../ui/Chip';
import { formatDateFr } from '../../ui/format';
import { GlassCard } from '../../ui/Glass';
import { Hero, HeroStatusBar, useHeroStatusBar } from '../../ui/Hero';
import { Toggle } from '../../ui/Toggle';
import { ActionButton, Body, Caption, Card, colors, Label, Overline, ScreenHeader, TOP_GAP } from '../../ui/kit';
import { TAB_BAR_CLEARANCE } from '../../ui/TabBar';
import { Section, SettingRow } from '../../ui/Section';
import { showDialog, showError } from '../../ui/dialog';
import { haptic, Reveal, Settle } from '../../ui/motion';

type Open = 'payday' | 'margin' | 'lead' | 'trial' | 'cancel' | null;

const HERO_OVERLAP = 44;
const subscriptionCount = (n: number) => `${n} abonnement${n > 1 ? 's' : ''}`;

function SmallButton({ label, onPress, tone = 'outline' }: { label: string; onPress: () => void; tone?: 'outline' | 'strong' }) {
  return <ActionButton label={label} size="sm" variant={tone === 'strong' ? 'warn' : 'outline'} onPress={onPress} />;
}

function Expandable({
  open,
  onToggle,
  label,
  value,
  children,
  last,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
  value: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <Settle>
      <YStack borderBottomWidth={last ? 0 : 1} borderColor="borderColor">
        <XStack
          py="3"
          minH={56}
          items="center"
          gap="3"
          onPress={() => {
            haptic.select();
            onToggle();
          }}
          opacity="1 press:0.7"
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`${label} : ${value}`}
        >
          <Body flex={1}>{label}</Body>
          <Label text="right" maxW="55%">
            {value}
          </Label>
          <YStack rotate={open ? '180deg' : '0deg'} transition="smooth">
            <ChevronDown color={colors.muted} size={20} />
          </YStack>
        </XStack>
        {open && (
          <Reveal>
            <YStack pb="4" gap="2">
              {children}
            </YStack>
          </Reveal>
        )}
      </YStack>
    </Settle>
  );
}

type ServiceState = 'ok' | 'off' | 'warn';

const SERVICE_ICON: Record<ServiceState, { icon: LucideIcon; color: string; tone: 'onGlassOk' | 'onGlassMuted' | 'onGlassWarn' }> = {
  ok: { icon: CircleCheck, color: colors.onGlassOk, tone: 'onGlassOk' },
  off: { icon: CircleMinus, color: colors.onGlassMuted, tone: 'onGlassMuted' },
  warn: { icon: CircleAlert, color: colors.onGlassWarn, tone: 'onGlassWarn' },
};

function ServiceLine({ icon: Icon, label, state, status }: { icon: LucideIcon; label: string; state: ServiceState; status: string }) {
  const s = SERVICE_ICON[state];
  return (
    <XStack
      minH={44}
      px="3"
      py="2"
      gap="3"
      items="center"
      bg="glassInner"
      borderWidth={1}
      borderColor="glassEdge"
      rounded={16}
      accessible
      accessibilityLabel={`${label} : ${status}`}
    >
      <Icon color={colors.onGlassMuted} size={18} />
      <Body flex={1} color="onGlass">
        {label}
      </Body>
      <s.icon color={s.color} size={14} />
      <Caption color={s.tone} shrink={1} text="right">
        {status}
      </Caption>
    </XStack>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const update = useUpdateSettings();
  const backup = useBackup();
  const [open, setOpen] = useState<Open>(null);
  const [notifOk, setNotifOk] = useState<boolean | null>(null);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [batteryOptimized, setBatteryOptimized] = useState(false);
  const focused = useIsFocused();
  const heroBar = useHeroStatusBar();
  const balances = useBalances();

  useEffect(() => {
    // Relu au retour des réglages Android : la carte batterie disparaît dès que l'optimisation est coupée.
    const refresh = () => {
      notificationsAllowed().then(setNotifOk);
      if (Platform.OS === 'android') {
        Battery.isBatteryOptimizationEnabledAsync()
          .then(setBatteryOptimized)
          .catch(() => setBatteryOptimized(false));
      }
    };
    refresh();
    biometricAvailable().then(setBioAvailable);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refresh();
      }
    });
    return () => subscription.remove();
  }, []);

  const s = settings.data;
  if (!s) {
    return <Spinner flex={1} color="primary" />;
  }

  const toggle = (key: Open) => setOpen((current) => (current === key ? null : key));
  const save = (patch: Parameters<typeof update.mutate>[0]) =>
    update.mutate(patch, { onError: (error) => showError('Réglage non enregistré', error.message) });
  const trialDays = parseDays(s.trial_reminder_days);
  const cancelDays = parseDays(s.cancel_reminder_days);
  const exactAlarmRelevant = Platform.OS === 'android' && Number(Platform.Version) >= 31;

  const pickTime = () => {
    const [h, m] = s.notif_time.split(':').map(Number);
    DateTimePickerAndroid.open({
      value: new Date(2026, 0, 1, h ?? 9, m ?? 0),
      mode: 'time',
      is24Hour: true,
      onChange: (event, date) => {
        if (event.type === 'set' && date) {
          save({ notif_time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` });
        }
      },
    });
  };

  const openAndroidSetting = (action: IntentLauncher.ActivityAction, withPackage = false) => {
    const packageName = Constants.expoConfig?.android?.package ?? 'host.exp.exponent';
    IntentLauncher.startActivityAsync(action, withPackage ? { data: `package:${packageName}` } : undefined).catch(() =>
      Linking.openSettings(),
    );
  };

  const toggleBiometric = async (value: boolean) => {
    if (await authenticate(value ? 'Activer le verrouillage' : 'Désactiver le verrouillage')) {
      save({ biometric_lock: value ? 1 : 0 });
    }
  };

  const runImport = async () => {
    try {
      const file = await backup.pickImport();
      if (!file) {
        return;
      }
      showDialog(
        'Remplacer toutes les données ?',
        `Le fichier du ${formatDateFr(file.exportedAt.slice(0, 10))} contient ${subscriptionCount(file.tables.subscription.length)}. Toutes les données actuelles seront remplacées. Une sauvegarde de sécurité est faite avant.`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Remplacer',
            style: 'destructive',
            onPress: () =>
              backup
                .replaceWith(file)
                .then((saved) => showDialog('Import terminé', `Sauvegarde de sécurité : ${saved}`, undefined, { tone: 'ok' }))
                .catch((error: Error) => showError('Import impossible', error.message)),
          },
        ],
      );
    } catch (error) {
      showError('Import impossible', error instanceof ImportError ? error.message : (error as Error).message);
    }
  };

  const remindersOn = s.reminders_enabled === 1;
  const enrichIncluded = readEnrichConfig() !== null;
  const aiOn = enrichIncluded && s.ai_suggestion_enabled === 1;
  const consentUntil = balances.data?.consentValidUntil.slice(0, 10);

  return (
    <YStack flex={1} bg="background">
      <HeroStatusBar past={heroBar.past} active={focused} />
      <ScrollView
        onScroll={heroBar.onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
      >
        <Hero pt={insets.top + TOP_GAP.tab} pb={HERO_OVERLAP + 20} gap="4">
          <ScreenHeader onHero title="Réglages" />
          <YStack px="4">
            <GlassCard gap="2" accessibilityLabel="État des services">
              <Caption color="onGlassMuted">État des services</Caption>
              {readBalancesConfig() ? (
                <ServiceLine
                  icon={Landmark}
                  label="Revolut"
                  state={consentUntil ? 'ok' : 'off'}
                  status={consentUntil ? `accord jusqu’au ${formatDateFr(consentUntil)}` : 'soldes indisponibles'}
                />
              ) : null}
              <ServiceLine
                icon={BellRing}
                label="Rappels"
                state={!remindersOn ? 'off' : notifOk === false ? 'warn' : 'ok'}
                status={!remindersOn ? 'coupés' : notifOk === false ? 'autorisation Android requise' : 'activés'}
              />
              <ServiceLine
                icon={Sparkles}
                label="Suggestion IA"
                state={aiOn ? 'ok' : 'off'}
                status={!enrichIncluded ? 'non incluse' : aiOn ? 'active' : 'coupée'}
              />
            </GlassCard>
          </YStack>
        </Hero>

        <YStack px="4" gap="5" mt={-HERO_OVERLAP}>
          {batteryOptimized ? (
            <Card tone="warn" gap="2">
              <Overline color="warnText">Optimisation de la batterie</Overline>
              <Body color="warnText">Elle est active pour l’app : les rappels de transfert peuvent ne pas arriver.</Body>
              <Caption color="warnText">Sur Xiaomi, autorise aussi le démarrage automatique dans les paramètres de l’app.</Caption>
              <XStack mt="1">
                <SmallButton
                  label="Corriger le réglage"
                  tone="strong"
                  onPress={() => openAndroidSetting(IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS)}
                />
              </XStack>
            </Card>
          ) : null}

          <Section onHero={!batteryOptimized} title="Virement et marge">
            <Expandable open={open === 'payday'} onToggle={() => toggle('payday')} label="Jour de paie" value={paydayLabel(s.payday_day)}>
              <PaydayGrid value={s.payday_day} onChange={(day) => save({ payday_day: day })} />
              <Caption>Un week-end ou un jour férié reporte le virement au jour ouvré suivant.</Caption>
            </Expandable>
            <Expandable
              open={open === 'margin'}
              onToggle={() => toggle('margin')}
              label={'Marge globale (max 5\u202f%)'}
              value={marginLabel(s.global_margin_bp)}
            >
              <MarginStepper value={s.global_margin_bp} onChange={(bp) => save({ global_margin_bp: bp })} />
              <Caption>Les prélèvements déjà alimentés gardent leur montant.</Caption>
            </Expandable>
            <Expandable
              open={open === 'lead'}
              onToggle={() => toggle('lead')}
              label="Délai d’alimentation"
              value={`J-${s.funding_lead_days}, avancé au dernier jour ouvré`}
              last
            >
              <XStack gap="2">
                {[1, 2, 3].map((d) => (
                  <Chip key={d} label={`J-${d}`} selected={s.funding_lead_days === d} onPress={() => save({ funding_lead_days: d })} />
                ))}
              </XStack>
            </Expandable>
          </Section>

          <Section title="Rappels">
            <SettingRow
              label="Envoyer les rappels"
              hint={remindersOn ? 'Transferts à faire, fins d’essai et fins de période.' : 'Aucune notification ne sera envoyée.'}
              last={!remindersOn}
            >
              <Toggle label="Envoyer les rappels" value={remindersOn} onChange={(on) => save({ reminders_enabled: on ? 1 : 0 })} />
            </SettingRow>
            {remindersOn ? (
              <>
                {notifOk === false ? (
                  <SettingRow label="Autorisation Android" hint="Les rappels ne peuvent pas s’afficher sans elle.">
                    <SmallButton
                      label="Autoriser"
                      onPress={() =>
                        requestNotifications().then((ok) => {
                          setNotifOk(ok);
                          if (ok) {
                            requestReschedule(0);
                          } else {
                            openAndroidSetting(IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS, true);
                          }
                        })
                      }
                    />
                  </SettingRow>
                ) : null}
                <SettingRow label="Heure des rappels">
                  <SmallButton label={s.notif_time} onPress={pickTime} />
                </SettingRow>
                <Expandable open={open === 'trial'} onToggle={() => toggle('trial')} label="Fin d’essai" value={reminderLabel(trialDays)}>
                  <ReminderChips value={trialDays} onChange={(days) => save({ trial_reminder_days: JSON.stringify(days) })} />
                </Expandable>
                <Expandable
                  open={open === 'cancel'}
                  onToggle={() => toggle('cancel')}
                  label="Fin de période (à résilier)"
                  value={reminderLabel(cancelDays)}
                  last={!exactAlarmRelevant}
                >
                  <ReminderChips value={cancelDays} onChange={(days) => save({ cancel_reminder_days: JSON.stringify(days) })} />
                </Expandable>
                {exactAlarmRelevant && (
                  <SettingRow label="Alarmes exactes Android" last>
                    <SmallButton
                      label="Vérifier"
                      onPress={() => openAndroidSetting(IntentLauncher.ActivityAction.REQUEST_SCHEDULE_EXACT_ALARM, true)}
                    />
                  </SettingRow>
                )}
              </>
            ) : null}
          </Section>

          <Section title="Suggestion IA">
            <SettingRow
              label="Suggérer catégorie, logo et lien de résiliation"
              hint={
                enrichIncluded
                  ? 'À partir du nom saisi. Seul le nom est envoyé. Coupée : seule la liste des marques connues sert.'
                  : 'Service non inclus dans cette version : la suggestion vient de la liste des marques connues.'
              }
              last
            >
              <Toggle
                label="Suggestion IA"
                value={aiOn}
                disabled={!enrichIncluded}
                onChange={(on) => save({ ai_suggestion_enabled: on ? 1 : 0 })}
              />
            </SettingRow>
          </Section>

          <Section title="Sécurité et données">
            <SettingRow label="Verrouillage biométrique" hint={bioAvailable ? undefined : 'Aucune empreinte enregistrée sur le téléphone'}>
              <Toggle
                label="Verrouillage biométrique"
                value={s.biometric_lock === 1 && bioAvailable}
                disabled={!bioAvailable}
                onChange={(checked) => toggleBiometric(checked)}
              />
            </SettingRow>
            <SettingRow label="Exporter (JSON)">
              <SmallButton
                label="Exporter"
                onPress={() => backup.exportAndShare().catch((e: Error) => showError('Export impossible', e.message))}
              />
            </SettingRow>
            <SettingRow label="Importer (remplace tout)" last>
              <SmallButton label="Importer" onPress={runImport} />
            </SettingRow>
          </Section>

          <Caption text="center">{`Sluis ${Constants.expoConfig?.version ?? ''}`}</Caption>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
