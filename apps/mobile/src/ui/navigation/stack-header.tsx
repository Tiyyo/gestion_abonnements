import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { XStack, YStack } from 'tamagui';
import { IconButton } from '@/ui/controls/icon-button';
import { Heading } from '@/ui/text/typography';

export function StackHeader({
  title,
  trailing,
  onBack,
  onHero,
}: {
  title?: string;
  trailing?: ReactNode;
  onBack?: () => void;
  onHero?: boolean;
}) {
  return (
    <XStack px="2" minH={52} items="center" gap="2">
      <IconButton icon={ChevronLeft} label="Retour" variant={onHero ? 'glass' : 'ghost'} onPress={onBack ?? (() => router.back())} />
      <YStack flex={1}>
        {title ? (
          <Heading numberOfLines={1} fontSize={22} color={onHero ? 'onGlass' : 'color'}>
            {title}
          </Heading>
        ) : null}
      </YStack>
      {trailing}
    </XStack>
  );
}
