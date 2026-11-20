import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MonthSwitcher } from './month-switcher';
import { TOP_GAP } from '@/theme/layout';
import { ScreenHeader } from '@/ui/navigation/screen-header';
import { Hero } from '@/ui/surfaces/hero';

export function PlanHero({ year, month, onShift }: { year: number; month: number; onShift: (delta: 1 | -1) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Hero pt={insets.top + TOP_GAP.tab} pb="4" gap="4">
      <ScreenHeader onHero title="Plan du mois" />
      <MonthSwitcher year={year} month={month} onShift={onShift} />
    </Hero>
  );
}
