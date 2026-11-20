import type { ReactNode } from 'react';
import { Text, YStack } from 'tamagui';
import { PILL_HEIGHT } from './tab-bar-metrics';

export function TabContent({ icon, label, color }: { icon: ReactNode; label: string; color: 'onPrimary' | 'colorMuted' }) {
  return (
    <YStack flex={1} h={PILL_HEIGHT} items="center" justify="center" gap="0.5" pointerEvents="none">
      {icon}
      <Text fontSize={11} fontWeight="600" color={color} numberOfLines={1}>
        {label}
      </Text>
    </YStack>
  );
}
