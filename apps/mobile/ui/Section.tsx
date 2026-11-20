import type { ReactNode } from 'react';
import { XStack, YStack } from 'tamagui';
import { Body, Caption, Card, Overline } from './kit';
import { Settle } from './motion';

/** `onHero` : premier bloc qui chevauche le dégradé du Hero (titre en blanc, carte surélevée). */
export function Section({ title, children, onHero }: { title: string; children: ReactNode; onHero?: boolean }) {
  return (
    <Settle>
      <YStack gap="2">
        <Overline px="1" color={onHero ? 'onGlassMuted' : undefined}>
          {title}
        </Overline>
        <Card py="0" gap="0" lift={onHero}>
          {children}
        </Card>
      </YStack>
    </Settle>
  );
}

export function SettingRow({ label, hint, children, last }: { label: string; hint?: string; children?: ReactNode; last?: boolean }) {
  return (
    <XStack py="3" gap="3" minH={56} items="center" justify="space-between" borderBottomWidth={last ? 0 : 1} borderColor="borderColor">
      <YStack flex={1} gap="0.5">
        <Body>{label}</Body>
        {hint && <Caption>{hint}</Caption>}
      </YStack>
      {children}
    </XStack>
  );
}
