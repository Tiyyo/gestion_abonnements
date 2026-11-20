import { formatEuros } from '@abonnements/core';
import { Check } from 'lucide-react-native';
import { XStack, YStack } from 'tamagui';
import type { MonthPlan } from '@/db/repositories/plan/types';
import { paydayLineLabel } from '@/features/plan/plan-labels';
import { formatDayMonth } from '@/lib/format';
import { colors } from '@/theme/colors';
import { ActionButton } from '@/ui/controls/action-button';
import { Card } from '@/ui/surfaces/card';
import { Amount, Body, Caption, Display, Label, Overline } from '@/ui/text/typography';

export function PaydayCard({ plan, busy, onDone, onUndo }: { plan: MonthPlan; busy: boolean; onDone: () => void; onUndo: () => void }) {
  const { payday } = plan;
  return (
    <Card>
      <Overline>{`Virement de paie · ${formatDayMonth(payday.date)}`}</Overline>
      <Display>{formatEuros(payday.totalCents)}</Display>
      <Caption>Banque → Revolut → coffre</Caption>
      <YStack borderTopWidth={1} borderColor="borderColor" mt="1" pt="3" gap="2">
        {payday.lines.map((line) => (
          <XStack key={`${line.kind}-${line.subscriptionId ?? ''}`} justify="space-between" gap="3">
            <Body color="colorMuted" shrink={1}>
              {paydayLineLabel(line, plan.globalMarginBp)}
            </Body>
            <Amount>{formatEuros(line.amountCents)}</Amount>
          </XStack>
        ))}
      </YStack>
      <XStack mt="2">
        {payday.done ? (
          <XStack flex={1} items="center" justify="space-between" gap="3">
            <XStack items="center" gap="2">
              <Check color={colors.ok} size={18} strokeWidth={2.5} />
              <Label color="okText">Virement fait</Label>
            </XStack>
            <ActionButton label="Annuler" variant="ghost" size="sm" disabled={busy} onPress={onUndo} />
          </XStack>
        ) : (
          <ActionButton flex={1} label="Marquer le virement fait" variant="outline" disabled={busy} onPress={onDone} />
        )}
      </XStack>
    </Card>
  );
}
