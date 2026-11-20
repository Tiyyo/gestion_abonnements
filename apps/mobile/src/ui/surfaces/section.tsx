import type { ReactNode } from 'react';
import { YStack } from 'tamagui';
import { Overline } from '@/ui/text/typography';
import { Settle } from '@/ui/motion/settle';
import { Card } from './card';

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
