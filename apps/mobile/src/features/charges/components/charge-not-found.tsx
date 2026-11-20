import { router } from 'expo-router';
import { YStack } from 'tamagui';
import { ActionButton } from '@/ui/controls/action-button';
import { Body } from '@/ui/text/typography';

export function ChargeNotFound() {
  return (
    <YStack flex={1} bg="background" items="center" justify="center" gap="3">
      <Body color="colorMuted">Prélèvement introuvable.</Body>
      <ActionButton label="Retour" variant="outline" onPress={() => router.back()} />
    </YStack>
  );
}
