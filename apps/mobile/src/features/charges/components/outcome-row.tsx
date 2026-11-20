import type { LucideIcon } from 'lucide-react-native';
import { XStack, YStack } from 'tamagui';
import { useColors } from '@/theme/use-colors';
import { Body, Caption } from '@/ui/text/typography';

/** Une conséquence expliquée dans une carte : pastille d'icône, titre et précision. */
export function OutcomeRow({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  const colors = useColors();
  return (
    <XStack gap="3" items="flex-start">
      <YStack w={32} h={32} rounded="full" items="center" justify="center" bg="primarySoft">
        <Icon color={colors.primaryText} size={16} />
      </YStack>
      <YStack flex={1} gap="0.5">
        <Body>{title}</Body>
        <Caption>{detail}</Caption>
      </YStack>
    </XStack>
  );
}
