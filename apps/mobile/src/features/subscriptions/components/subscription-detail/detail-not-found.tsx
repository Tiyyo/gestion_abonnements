import { router } from 'expo-router';
import { YStack } from 'tamagui';
import { Body } from '@/ui/text/typography';
import { DetailButton } from './detail-button';

export function DetailNotFound() {
  return (
    <YStack flex={1} bg="background" items="center" justify="center" gap="3">
      <Body color="colorMuted">Abonnement introuvable.</Body>
      <DetailButton label="Retour" tone="neutral" onPress={() => router.back()} />
    </YStack>
  );
}
