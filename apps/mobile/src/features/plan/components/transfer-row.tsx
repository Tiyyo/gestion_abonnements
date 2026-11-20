import { formatEuros } from '@abonnements/core';
import { XStack, YStack } from 'tamagui';
import { TransferCheck } from './transfer-check';
import type { PlanTransfer } from '@/db/repositories/plan/types';
import { chargeLine } from '@/features/plan/plan-labels';
import { formatDayMonth, formatWeekdayDayMonth } from '@/lib/format';
import { Card } from '@/ui/surfaces/card';
import { Amount, Caption, Label } from '@/ui/text/typography';

export function TransferRow({
  transfer,
  busy,
  onToggle,
  onMore,
}: {
  transfer: PlanTransfer;
  busy: boolean;
  onToggle: () => void;
  onMore: () => void;
}) {
  const names = transfer.charges.map((c) => c.name).join(', ');
  return (
    <Card p="0" gap="0">
      <XStack items="center" minH={64}>
        <TransferCheck
          done={transfer.done}
          disabled={busy}
          label={`Transfert du ${formatDayMonth(transfer.effectiveDate)}, ${names}`}
          onPress={onToggle}
        />
        <YStack flex={1} py="3" gap="0.5" onPress={onMore} accessibilityRole="button" accessibilityHint="Reporter ou annuler">
          <Label color={transfer.done ? 'colorMuted' : 'color'} textDecorationLine={transfer.done ? 'line-through' : 'none'}>
            {`${formatWeekdayDayMonth(transfer.effectiveDate)} · ${names}`}
          </Label>
          {transfer.rescheduled && <Caption color="warnText">{`Reporté (prévu le ${formatDayMonth(transfer.plannedDate)})`}</Caption>}
          {transfer.charges.map((c) => (
            <Caption key={`${c.name}-${c.dueDate}`}>{chargeLine(transfer, c)}</Caption>
          ))}
        </YStack>
        <Amount px="4" fontSize={16} color={transfer.done ? 'colorMuted' : 'color'}>
          {formatEuros(transfer.amountCents)}
        </Amount>
      </XStack>
    </Card>
  );
}
