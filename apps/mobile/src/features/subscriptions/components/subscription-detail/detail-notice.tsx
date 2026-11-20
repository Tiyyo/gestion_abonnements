import { Card } from '@/ui/surfaces/card';
import { Body, Overline } from '@/ui/text/typography';

export function DetailNotice({ tone, title, children }: { tone: 'warn' | 'danger'; title: string; children: string }) {
  const fg = tone === 'warn' ? 'warnText' : 'dangerText';
  return (
    <Card tone={tone} p="3" gap="1">
      <Overline color={fg}>{title}</Overline>
      <Body color={fg}>{children}</Body>
    </Card>
  );
}
