import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from 'tamagui';
import { DayAgenda } from './day-agenda';
import { MonthGrid } from './month-grid';
import type { MonthPlan } from '@/db/repositories/plan/types';
import { monthDayItems, resolveSelectedDay } from '@/features/plan/calendar-items';
import { useMonthPlan } from '@/features/plan/hooks/use-month-plan';
import type { usePlanCommands } from '@/features/plan/hooks/use-plan-commands';
import { shiftMonth } from '@/features/plan/month';
import { haptic } from '@/ui/motion/haptics';
import { TAB_BAR_CLEARANCE } from '@/ui/navigation/tab-bar/tab-bar-metrics';

/**
 * Calendrier du mois civil : grille, légende, puis le détail du jour choisi.
 * Le mois civil chevauche deux périodes de paie : on ajoute le plan de la période précédente à celui du mois affiché.
 */
export function MonthCalendarView({
  plan,
  year,
  month,
  today,
  commands,
}: {
  plan: MonthPlan;
  year: number;
  month: number;
  today: string;
  commands: ReturnType<typeof usePlanCommands>;
}) {
  const insets = useSafeAreaInsets();
  const [previousYear, previousMonth] = shiftMonth(year, month, -1);
  const previous = useMonthPlan(previousYear, previousMonth);
  const [picked, setPicked] = useState<string | null>(null);
  const items = monthDayItems(previous.data ? [previous.data, plan] : [plan], year, month);
  const selected = resolveSelectedDay(picked, year, month, today, items);
  const select = (date: string) => {
    if (date !== selected) {
      haptic.select();
    }
    setPicked(date);
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}>
      <MonthGrid year={year} month={month} today={today} items={items} selected={selected} onSelect={select} />
      <DayAgenda key={selected} date={selected} items={items.get(selected) ?? []} commands={commands} />
    </ScrollView>
  );
}
