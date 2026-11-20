import { formatEuros } from '@abonnements/core';
import { PiggyBank } from 'lucide-react-native';
import { XStack, YStack } from 'tamagui';
import { formatPercentBp as marginLabel } from '@/lib/format';
import { useColors } from '@/theme/use-colors';
import { RADIUS } from '@/theme/elevation';
import { Caption, Label } from '@/ui/text/typography';

/** Ce qui sortira du coffre à chaque prélèvement, et la mise de côté mensuelle d'un abonnement provisionné. */
export function FundingPreview({ funded, monthly, marginBp }: { funded: number; monthly: number | null; marginBp: number }) {
  const colors = useColors();
  return (
    <XStack bg="subtle" rounded={RADIUS.row} p="4" gap="3" items="center">
      <YStack w={40} h={40} rounded="full" bg="secondary" items="center" justify="center">
        <PiggyBank color={colors.onSecondary} size={20} />
      </YStack>
      <YStack flex={1} gap="0.5">
        <Label>{`${formatEuros(funded)} à sortir du coffre`}</Label>
        <Caption>
          {monthly
            ? `à chaque prélèvement, mis de côté à ${formatEuros(monthly)} par mois · marge ${marginLabel(marginBp)}`
            : `à chaque prélèvement · marge ${marginLabel(marginBp)}`}
        </Caption>
      </YStack>
    </XStack>
  );
}
