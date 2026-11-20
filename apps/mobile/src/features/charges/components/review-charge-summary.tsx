import { formatEuros } from '@abonnements/core';
import { YStack } from 'tamagui';
import type { ChargeToReview } from '@/features/charges/types';
import { dateShort } from '@/lib/dates';
import { Body, Overline, ScreenTitle } from '@/ui/text/typography';

export function ReviewChargeSummary({ row }: { row: ChargeToReview }) {
  return (
    <YStack gap="1">
      <Overline>{`Prélèvement prévu le ${dateShort(row.due_date)}`}</Overline>
      <ScreenTitle>{row.name}</ScreenTitle>
      <Body color="colorMuted">
        {row.status === 'unfunded'
          ? 'Ce prélèvement n’était pas financé : il a normalement échoué. Vérifie ton relevé Revolut.'
          : `Attendu ${formatEuros(row.expected_amount_cents)}, financé ${formatEuros(row.funded_amount_cents)}. Vérifie ton relevé Revolut.`}
      </Body>
    </YStack>
  );
}
