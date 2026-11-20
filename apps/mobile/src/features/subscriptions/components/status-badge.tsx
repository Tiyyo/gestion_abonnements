import type { SubscriptionStatus } from '@abonnements/core';
import { Text, YStack } from 'tamagui';

const STYLES: Record<SubscriptionStatus, { label: string; bg: string; fg: string }> = {
  trial: { label: 'Essai', bg: 'warnBg', fg: 'warnText' },
  active: { label: 'Actif', bg: 'okBg', fg: 'okText' },
  to_cancel: { label: 'À résilier', bg: 'dangerBg', fg: 'dangerText' },
  cancelled: { label: 'Résilié', bg: 'subtle', fg: 'colorMuted' },
};

export function StatusBadge({ status }: { status: SubscriptionStatus }) {
  const style = STYLES[status];
  return (
    <YStack px="2" py="0.5" rounded="sm" backgroundColor={style.bg as 'warnBg'}>
      <Text fontSize={12} fontWeight="600" color={style.fg as 'warnText'}>
        {style.label}
      </Text>
    </YStack>
  );
}
