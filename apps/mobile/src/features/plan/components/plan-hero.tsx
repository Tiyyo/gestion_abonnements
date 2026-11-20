import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import { MonthSwitcher } from './month-switcher';
import type { PlanViewMode } from '@/features/plan/hooks/use-plan-view-mode';
import { TOP_GAP } from '@/theme/layout';
import { Segmented } from '@/ui/controls/segmented';
import { ScreenHeader } from '@/ui/navigation/screen-header';
import { Hero } from '@/ui/surfaces/hero';

const VIEW_OPTIONS = [
  { key: 'list', label: 'Liste' },
  { key: 'calendar', label: 'Calendrier' },
] as const;

export function PlanHero({
  year,
  month,
  onShift,
  mode,
  onModeChange,
}: {
  year: number;
  month: number;
  onShift: (delta: 1 | -1) => void;
  mode: PlanViewMode;
  onModeChange: (mode: PlanViewMode) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Hero pt={insets.top + TOP_GAP.tab} pb="4" gap="4">
      <ScreenHeader onHero title="Plan du mois" />
      <YStack gap="2">
        <MonthSwitcher year={year} month={month} onShift={onShift} />
        <YStack mx="4">
          <Segmented label="Affichage du plan" options={VIEW_OPTIONS} value={mode} onChange={onModeChange} onGlass />
        </YStack>
      </YStack>
    </Hero>
  );
}
