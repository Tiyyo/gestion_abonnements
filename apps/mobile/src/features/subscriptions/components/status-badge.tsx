import type { SubscriptionStatus } from '@abonnements/core';
import { Text, YStack } from 'tamagui';
import { RADIUS } from '@/theme/elevation';

const STYLES: Record<SubscriptionStatus, { label: string; bg: string; fg: string; glassFg: string }> = {
  trial: { label: 'Essai', bg: 'warnBg', fg: 'warnText', glassFg: 'onGlassWarn' },
  active: { label: 'Actif', bg: 'okBg', fg: 'okText', glassFg: 'onGlassOk' },
  to_cancel: { label: 'À résilier', bg: 'dangerBg', fg: 'dangerText', glassFg: 'onGlassDanger' },
  cancelled: { label: 'Résilié', bg: 'subtle', fg: 'colorMuted', glassFg: 'onGlassMuted' },
};

/** `onGlass` : pastille en verre pour une carte posée sur le dégradé du Hero (couleurs `onGlass*`, contrastes mesurés). */
export function StatusBadge({ status, onGlass }: { status: SubscriptionStatus; onGlass?: boolean }) {
  const style = STYLES[status];
  if (onGlass) {
    return (
      <YStack px="2.5" py="1" rounded={RADIUS.pill} bg="glassInner" borderWidth={1} borderColor="glassEdge">
        <Text fontSize={12} fontWeight="600" color={style.glassFg as 'onGlass'}>
          {style.label}
        </Text>
      </YStack>
    );
  }
  return (
    <YStack px="2" py="0.5" rounded="sm" backgroundColor={style.bg as 'warnBg'}>
      <Text fontSize={12} fontWeight="600" color={style.fg as 'warnText'}>
        {style.label}
      </Text>
    </YStack>
  );
}
