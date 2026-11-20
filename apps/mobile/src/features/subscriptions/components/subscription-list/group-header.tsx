import { XStack, YStack } from 'tamagui';
import { Overline } from '@/ui/text/typography';

export function GroupHeader({ title, count, dot }: { title: string; count: number; dot?: string }) {
  return (
    <XStack px="1" items="center" gap="2" accessibilityRole="header">
      {dot ? <YStack w={8} h={8} rounded={4} bg={dot as 'okText'} /> : null}
      <Overline>{title}</Overline>
      <Overline color="colorMuted" fontWeight="500">
        {String(count)}
      </Overline>
    </XStack>
  );
}
