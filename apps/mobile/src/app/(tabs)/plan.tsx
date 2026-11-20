import { todayIn } from '@abonnements/core';
import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Spinner, YStack } from 'tamagui';
import { MonthPlanView } from '@/features/plan/components/month-plan-view';
import { MonthTransition } from '@/features/plan/components/month-transition';
import { PlanHero } from '@/features/plan/components/plan-hero';
import { useMonthPlan } from '@/features/plan/hooks/use-month-plan';
import { useMonthSwitcher } from '@/features/plan/hooks/use-month-switcher';
import { usePlanCommands } from '@/features/plan/hooks/use-plan-commands';

export default function PlanScreen() {
  const focused = useIsFocused();
  const today = todayIn();
  const { year, month, direction, goMonth } = useMonthSwitcher(today);
  const plan = useMonthPlan(year, month);
  const commands = usePlanCommands(today);

  return (
    <YStack flex={1} bg="background">
      {focused ? <StatusBar style="light" /> : null}
      <PlanHero year={year} month={month} onShift={goMonth} />
      {!plan.data ? (
        <Spinner mt="8" color="primary" />
      ) : (
        <MonthTransition key={`${year}-${month}`} direction={direction}>
          <MonthPlanView plan={plan.data} today={today} commands={commands} />
        </MonthTransition>
      )}
    </YStack>
  );
}
