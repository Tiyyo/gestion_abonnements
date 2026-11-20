import { todayIn } from '@abonnements/core';
import { useIsFocused } from 'expo-router';
import { YStack } from 'tamagui';
import { MonthCalendarView } from '@/features/plan/components/month-calendar-view';
import { MonthPlanSkeleton } from '@/features/plan/components/month-plan-skeleton';
import { AppStatusBar } from '@/ui/navigation/app-status-bar';
import { MonthPlanView } from '@/features/plan/components/month-plan-view';
import { MonthTransition } from '@/features/plan/components/month-transition';
import { PlanHero } from '@/features/plan/components/plan-hero';
import { useMonthPlan } from '@/features/plan/hooks/use-month-plan';
import { useMonthSwitcher } from '@/features/plan/hooks/use-month-switcher';
import { usePlanCommands } from '@/features/plan/hooks/use-plan-commands';
import { usePlanViewMode } from '@/features/plan/hooks/use-plan-view-mode';
import { useDelayedFlag } from '@/ui/hooks/use-delayed-flag';

export default function PlanScreen() {
  const focused = useIsFocused();
  const today = todayIn();
  const { year, month, direction, goMonth } = useMonthSwitcher(today);
  const [mode, setMode] = usePlanViewMode();
  const plan = useMonthPlan(year, month);
  const commands = usePlanCommands(today);
  const showSkeleton = useDelayedFlag(!plan.data);

  return (
    <YStack flex={1} bg="background">
      {focused ? <AppStatusBar onDark /> : null}
      <PlanHero year={year} month={month} onShift={goMonth} mode={mode} onModeChange={setMode} />
      {!plan.data ? (
        showSkeleton ? (
          <MonthPlanSkeleton />
        ) : null
      ) : (
        <MonthTransition key={`${year}-${month}`} direction={direction}>
          {mode === 'calendar' ? (
            <MonthCalendarView plan={plan.data} year={year} month={month} today={today} commands={commands} />
          ) : (
            <MonthPlanView plan={plan.data} today={today} commands={commands} />
          )}
        </MonthTransition>
      )}
    </YStack>
  );
}
