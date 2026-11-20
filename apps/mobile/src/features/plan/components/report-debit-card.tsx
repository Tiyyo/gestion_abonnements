import { router } from 'expo-router';
import { ReceiptEuro } from 'lucide-react-native';
import { XStack, YStack } from 'tamagui';
import { colors } from '@/theme/colors';
import { ActionButton } from '@/ui/controls/action-button';
import { Card } from '@/ui/surfaces/card';
import { Body, Caption } from '@/ui/text/typography';

/** Entrée vers la saisie d'un débit imprévu, en fin de Plan, là où l'on compare le relevé au plan. */
export function ReportDebitCard() {
  return (
    <Card gap="3">
      <XStack gap="3" items="center">
        <YStack w={40} h={40} rounded="full" items="center" justify="center" bg="primarySoft">
          <ReceiptEuro color={colors.primary} size={20} />
        </YStack>
        <YStack flex={1} gap="0.5">
          <Body fontWeight="600">Un débit que tu n’attendais pas ?</Body>
          <Caption>Signale-le : Sluis le rapproche d’un abonnement ou te propose de le créer.</Caption>
        </YStack>
      </XStack>
      <ActionButton variant="soft" label="Signaler un prélèvement" onPress={() => router.push('/charges/unknown')} />
    </Card>
  );
}
