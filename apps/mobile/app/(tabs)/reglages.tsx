import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';
import { type ReactNode, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronDown } from 'lucide-react-native';
import { ScrollView, Spinner, Switch, XStack, YStack } from 'tamagui';
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
import { readEnrichConfig } from '../../features/enrich';
import { useSettings, useUpdateSettings } from '../../features/settings';
import { notificationsAllowed, requestNotifications, requestReschedule } from '../../notifications/scheduler';
import { Chip } from '../../ui/Chip';
import { ActionButton, Body, Caption, Card, colors, Label, Overline, ScreenHeader, TOP_GAP } from '../../ui/kit';
import { TAB_BAR_CLEARANCE } from '../../ui/TabBar';
import { Section, SettingRow } from '../../ui/Section';
import { showDialog, showError } from '../../ui/dialog';
import { haptic, Reveal, Settle } from '../../ui/motion';

type Open = 'payday' | 'margin' | 'lead' | 'trial' | 'cancel' | null;

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
      <YStack borderBottomWidth={last && !open ? 0 : 1} borderColor="borderColor">
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

function StatusPill({ on }: { on: boolean }) {
  return (
    <XStack items="center" gap="1.5" bg={on ? 'okBg' : 'subtle'} px="2.5" py="1.5" rounded="md">
      {on ? <Check color={colors.ok} size={16} strokeWidth={2.5} /> : null}
      <Label fontSize={14} color={on ? 'okText' : 'colorMuted'}>
        {on ? 'Active' : 'Inactive'}
      </Label>
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

  useEffect(() => {
    notificationsAllowed().then(setNotifOk);
    biometricAvailable().then(setBioAvailable);
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
        `Le fichier du ${file.exportedAt.slice(0, 10)} contient ${file.tables.subscription.length} abonnement(s). Toutes les données actuelles seront remplacées. Une sauvegarde de sécurité est faite avant.`,
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

  return (
    <YStack flex={1} bg="background" pt={insets.top + TOP_GAP.tab}>
      <ScreenHeader title="Réglages" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
      >
        <Section title="Virement et marge">
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

        <Section title="Notifications">
          <SettingRow label="Notifications">
            {notifOk ? (
              <XStack items="center" gap="1.5" bg="okBg" px="2.5" py="1.5" rounded="md">
                <Check color={colors.ok} size={16} strokeWidth={2.5} />
                <Label fontSize={14} color="okText">
                  Autorisées
                </Label>
              </XStack>
            ) : (
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
            )}
          </SettingRow>
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
        </Section>

        <Card tone="warn" gap="2">
          <Overline color="warnText">Optimisation de la batterie</Overline>
          <Body color="warnText">Si elle est active pour l’app, les rappels d’alimentation peuvent ne pas arriver.</Body>
          <Caption color="warnText">Sur Xiaomi, autorise aussi le démarrage automatique dans les paramètres de l’app.</Caption>
          <XStack mt="1">
            <SmallButton
              label="Corriger le réglage"
              tone="strong"
              onPress={() => openAndroidSetting(IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS)}
            />
          </XStack>
        </Card>

        <Section title="Sécurité et données">
          <SettingRow label="Verrouillage biométrique" hint={bioAvailable ? undefined : 'Aucune empreinte enregistrée sur le téléphone'}>
            <Switch
              size="$4"
              checked={s.biometric_lock === 1}
              disabled={!bioAvailable}
              onCheckedChange={(checked) => {
                haptic.select();
                toggleBiometric(checked);
              }}
              bg={s.biometric_lock === 1 ? 'primary' : 'borderControl'}
              accessibilityLabel="Verrouillage biométrique"
            >
              <Switch.Thumb bg="surface" transition="smooth" />
            </Switch>
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

        <Section title="Suggestion IA">
          <SettingRow
            label="Catégorie, logo et lien de résiliation"
            hint={
              readEnrichConfig()
                ? 'Proposés à partir du nom saisi. Seul le nom est envoyé.'
                : 'Service non inclus dans cette version : la suggestion vient de la liste des marques connues.'
            }
            last
          >
            <StatusPill on={!!readEnrichConfig()} />
          </SettingRow>
        </Section>

        <Caption text="center">{`Sluis ${Constants.expoConfig?.version ?? ''}`}</Caption>
      </ScrollView>
    </YStack>
  );
}
