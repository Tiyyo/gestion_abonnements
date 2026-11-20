import Animated, { FadeIn } from 'react-native-reanimated';
import { YStack } from 'tamagui';
import { DayChargesCard, type DayDue } from './day-charges-card';
import { PaydayCard } from './payday-card';
import { TransferRow } from './transfer-row';
import type { DayItem } from '@/features/plan/calendar-items';
import { dayTitle } from '@/features/plan/calendar-labels';
import type { usePlanCommands } from '@/features/plan/hooks/use-plan-commands';
import { easeOut } from '@/ui/motion/easing';
import { Card } from '@/ui/surfaces/card';
import { SectionTitle } from '@/ui/text/section-title';
import { Body } from '@/ui/text/typography';

/** Détail du jour choisi dans le calendrier : virement de paie, transferts (mêmes actions que la liste), prélèvements. Le parent change la `key` à chaque jour (fondu d’entrée). */
export function DayAgenda({ date, items, commands }: { date: string; items: DayItem[]; commands: ReturnType<typeof usePlanCommands> }) {
  const { busy } = commands;
  const dues = items.filter((item): item is DayDue => item.kind === 'charge' || item.kind === 'trial');
  return (
    <Animated.View entering={FadeIn.duration(160).easing(easeOut)}>
      <YStack gap="3">
        <SectionTitle>{dayTitle(date)}</SectionTitle>
        {items.length === 0 && (
          <Card>
            <Body color="colorMuted">Rien ce jour-là.</Body>
          </Card>
        )}
        {items.map((item) =>
          item.kind === 'payday' ? (
            <PaydayCard
              key={`payday-${item.plan.payday.date}`}
              plan={item.plan}
              busy={busy}
              onDone={() => commands.paydayDone(item.plan)}
              onUndo={() => commands.paydayUndo(item.plan)}
            />
          ) : item.kind === 'transfer' ? (
            <TransferRow
              key={item.transfer.id}
              transfer={item.transfer}
              busy={busy}
              onToggle={() => commands.toggleTransfer(item.transfer)}
              onMore={() => commands.moreTransfer(item.transfer)}
            />
          ) : null,
        )}
        <DayChargesCard dues={dues} />
      </YStack>
    </Animated.View>
  );
}
