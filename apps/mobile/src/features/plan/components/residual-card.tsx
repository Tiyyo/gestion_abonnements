import { formatEuros } from '@abonnements/core';
import { XStack } from 'tamagui';
import { dateShort } from '@/lib/dates';
import { ActionButton } from '@/ui/controls/action-button';
import { Card } from '@/ui/surfaces/card';
import { Body, Label, Overline } from '@/ui/text/typography';

/** Résidu estimé à renvoyer au coffre : rien n'est affiché quand il n'est pas calculable (`null`). */
export function ResidualCard({
  residualCents,
  today,
  busy,
  onReturn,
}: {
  residualCents: number | null;
  today: string;
  busy: boolean;
  onReturn: (amountCents: number) => void;
}) {
  if (residualCents === null) {
    return null;
  }
  return (
    <Card>
      <Overline>{`Résidu estimé · ${dateShort(today)}`}</Overline>
      {residualCents === 0 ? (
        <Body color="colorMuted">Rien à renvoyer au coffre pour l’instant.</Body>
      ) : (
        <XStack items="center" justify="space-between" gap="3">
          <Label flex={1}>{`${formatEuros(residualCents)} à renvoyer au coffre`}</Label>
          <ActionButton label="Renvoyer" variant="outline" disabled={busy} onPress={() => onReturn(residualCents)} />
        </XStack>
      )}
    </Card>
  );
}
