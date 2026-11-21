import Constants from 'expo-constants';
import { useIsFocused } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, Spinner, YStack } from 'tamagui';
import { readTransactionsConfig } from '@/config/function-config';
import { readEnrichConfig } from '@/features/enrich/enrich-client';
import { AiSuggestionSection } from '@/features/settings/components/ai-suggestion-section';
import { BankSyncSection } from '@/features/settings/components/bank-sync-section';
import { AppearanceSection } from '@/features/settings/components/appearance-section';
import { BatteryOptimizationCard } from '@/features/settings/components/battery-optimization-card';
import { RemindersSection } from '@/features/settings/components/reminders-section';
import { SecurityDataSection } from '@/features/settings/components/security-data-section';
import { ServicesStatusCard } from '@/features/settings/components/services-status-card';
import { TransferSection } from '@/features/settings/components/transfer-section';
import { useBatteryOptimization } from '@/features/settings/hooks/use-battery-optimization';
import { useExpandedRow } from '@/features/settings/hooks/use-expanded-row';
import { useNotificationPermission } from '@/features/settings/hooks/use-notification-permission';
import { useSaveSetting } from '@/features/settings/hooks/use-save-setting';
import { useSettings } from '@/features/settings/hooks/use-settings';
import { TOP_GAP } from '@/theme/layout';
import { HeroStatusBar } from '@/ui/navigation/hero-status-bar';
import { ScreenHeader } from '@/ui/navigation/screen-header';
import { TAB_BAR_CLEARANCE } from '@/ui/navigation/tab-bar/tab-bar-metrics';
import { useHeroStatusBar } from '@/ui/navigation/use-hero-status-bar';
import { Hero } from '@/ui/surfaces/hero';
import { Caption } from '@/ui/text/typography';

const HERO_OVERLAP = 44;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const settings = useSettings();
  const save = useSaveSetting();
  const rows = useExpandedRow();
  const notifications = useNotificationPermission();
  const batteryOptimized = useBatteryOptimization();
  const focused = useIsFocused();
  const heroBar = useHeroStatusBar();

  const s = settings.data;
  if (!s) {
    return <Spinner flex={1} color="primaryText" />;
  }

  const remindersOn = s.reminders_enabled === 1;
  const enrichIncluded = readEnrichConfig() !== null;
  const aiOn = enrichIncluded && s.ai_suggestion_enabled === 1;
  const reconcileIncluded = readTransactionsConfig() !== null;
  const reconcileOn = reconcileIncluded && s.auto_reconcile_enabled === 1;

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
            <ServicesStatusCard
              remindersOn={remindersOn}
              notificationsAllowed={notifications.allowed}
              enrichIncluded={enrichIncluded}
              aiOn={aiOn}
              reconcileOn={reconcileOn}
              syncedThrough={s.bank_sync_through}
            />
          </YStack>
        </Hero>

        <YStack px="4" gap="5" mt={-HERO_OVERLAP}>
          {batteryOptimized ? <BatteryOptimizationCard /> : null}
          <TransferSection settings={s} rows={rows} save={save} onHero={!batteryOptimized} />
          <RemindersSection
            settings={s}
            rows={rows}
            save={save}
            notificationsAllowed={notifications.allowed}
            onAuthorize={notifications.authorize}
          />
          <BankSyncSection included={reconcileIncluded} on={reconcileOn} save={save} />
          <AiSuggestionSection enrichIncluded={enrichIncluded} aiOn={aiOn} save={save} />
          <AppearanceSection mode={s.theme_mode} save={save} />
          <SecurityDataSection settings={s} save={save} />
          <Caption text="center">{`Sluis ${Constants.expoConfig?.version ?? ''}`}</Caption>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
