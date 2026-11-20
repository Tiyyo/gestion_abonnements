import { type ReactNode } from 'react';
import { XStack, YStack } from 'tamagui';
import { Overline, ScreenTitle } from '@/ui/text/typography';

export function ScreenHeader({
  overline,
  title,
  trailing,
  onHero,
}: {
  overline?: string;
  title: string;
  trailing?: ReactNode;
  onHero?: boolean;
}) {
  return (
    <XStack px="4" items="flex-end" justify="space-between" gap="3">
      <YStack shrink={1} gap="0.5">
        {overline ? <Overline color={onHero ? 'onGlassMuted' : 'colorMuted'}>{overline}</Overline> : null}
        <ScreenTitle color={onHero ? 'onGlass' : 'color'}>{title}</ScreenTitle>
      </YStack>
      {trailing ? (
        <XStack gap="2" items="center">
          {trailing}
        </XStack>
      ) : null}
    </XStack>
  );
}
