import { formatEuros } from '@abonnements/core';
import { XStack, YStack } from 'tamagui';
import { CalendarMarker } from './calendar-marker';
import type { DayItem } from '@/features/plan/calendar-items';
import { chargeDayNote, trialDayNote } from '@/features/plan/calendar-labels';
import { Card } from '@/ui/surfaces/card';
import { Amount, Caption, Label } from '@/ui/text/typography';

export type DayDue = Extract<DayItem, { kind: 'charge' | 'trial' }>;

function DueRow({ due }: { due: DayDue }) {
  const trial = due.kind === 'trial';
  return (
    <XStack gap="3" items="center" minH={44}>
      <CalendarMarker kind={due.kind} />
      <YStack flex={1} gap="0.5">
        <Label>{trial ? due.trial.name : due.name}</Label>
        <Caption color={trial && due.trial.risk ? 'warnText' : 'colorMuted'}>
          {trial ? trialDayNote(due.trial) : chargeDayNote(due)}
        </Caption>
      </YStack>
      <Amount>{formatEuros(trial ? due.trial.amountCents : due.amountCents)}</Amount>
    </XStack>
  );
}

/** Prélèvements attendus un jour donné : nom, financement et montant ; une fin d'essai porte le repère d'alerte. */
export function DayChargesCard({ dues }: { dues: DayDue[] }) {
  if (dues.length === 0) {
    return null;
  }
  return (
    <Card gap="2">
      {dues.map((due, index) => (
        <DueRow key={index} due={due} />
      ))}
    </Card>
  );
}
