import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from 'tamagui';
import type { MonthPlan } from '@/db/repositories/plan/types';
import type { usePlanCommands } from '@/features/plan/hooks/use-plan-commands';
import { PaydayCard } from './payday-card';
import { ResidualCard } from './residual-card';
import { TrialsCard } from './trials-card';
import { VaultTransfers } from './vault-transfers';
import { TAB_BAR_CLEARANCE } from '@/ui/navigation/tab-bar/tab-bar-metrics';

/** Contenu défilant du Plan pour un mois : virement de paie, transferts, essais, résidu. */
export function MonthPlanView({ plan, today, commands }: { plan: MonthPlan; today: string; commands: ReturnType<typeof usePlanCommands> }) {
  const insets = useSafeAreaInsets();
  const { busy } = commands;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}>
      <PaydayCard plan={plan} busy={busy} onDone={() => commands.paydayDone(plan)} onUndo={() => commands.paydayUndo(plan)} />
      <VaultTransfers transfers={plan.transfers} busy={busy} onToggle={commands.toggleTransfer} onMore={commands.moreTransfer} />
      <TrialsCard trials={plan.trials} />
      <ResidualCard residualCents={plan.residualCents} today={today} busy={busy} onReturn={commands.returnResidual} />
    </ScrollView>
  );
}
