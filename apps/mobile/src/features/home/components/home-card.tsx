import type { ReactNode } from 'react';
import { XStack } from 'tamagui';
import { Card } from '@/ui/surfaces/card';
import { Body, CardTitle, Display, Overline } from '@/ui/text/typography';

export type HomeTone = 'accent' | 'warn' | 'danger' | 'plain';

const FG: Record<HomeTone, { fg: string; muted: string }> = {
  accent: { fg: 'color', muted: 'colorMuted' },
  warn: { fg: 'color', muted: 'warnText' },
  danger: { fg: 'dangerText', muted: 'dangerText' },
  plain: { fg: 'color', muted: 'colorMuted' },
};

interface Props {
  tone: HomeTone;
  caption: string;
  title?: string;
  body?: string;
  actions?: ReactNode;
}

export function HomeCard({ tone, caption, title, body, actions }: Props) {
  const t = FG[tone];
  return (
    <Card tone={tone === 'accent' ? 'plain' : tone} lift={tone === 'accent'}>
      <Overline color={t.muted as 'color'}>{caption}</Overline>
      {title && (tone === 'accent' ? <Display color="primary">{title}</Display> : <CardTitle color={t.fg as 'color'}>{title}</CardTitle>)}
      {body && <Body color={t.fg as 'color'}>{body}</Body>}
      {actions && (
        <XStack gap="3" mt="2">
          {actions}
        </XStack>
      )}
    </Card>
  );
}
