import type { LucideIcon } from 'lucide-react-native';
import { XStack } from 'tamagui';
import { Caption } from '@/ui/text/typography';

export function Notice({ icon: Icon, color, tone, children }: { icon: LucideIcon; color: string; tone: string; children: string }) {
  return (
    <XStack gap="2" items="center" accessibilityLiveRegion="polite">
      <Icon color={color} size={16} />
      <Caption flex={1} color={tone as 'okText'}>
        {children}
      </Caption>
    </XStack>
  );
}
