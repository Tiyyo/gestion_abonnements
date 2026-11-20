import { YStack, type YStackProps } from 'tamagui';
import { RADIUS, type ShadowLevel } from '@/theme/elevation';
import { useShadows } from '@/theme/use-shadows';

export type Tone = 'plain' | 'accent' | 'warn' | 'danger' | 'ok';

// L'élévation passe par l'ombre (teintée selon le ton), plus par la bordure. En sombre, l'ombre porte un liseré clair (theme/elevation).
const TONES: Record<Tone, { bg: string; shadow: ShadowLevel }> = {
  plain: { bg: 'surface', shadow: 'md' },
  accent: { bg: 'primary', shadow: 'accent' },
  warn: { bg: 'warnBg', shadow: 'warn' },
  danger: { bg: 'dangerBg', shadow: 'danger' },
  ok: { bg: 'okBg', shadow: 'ok' },
};

export function Card({ tone = 'plain', lift, children, style, ...props }: YStackProps & { tone?: Tone; lift?: boolean }) {
  const t = TONES[tone];
  const shadow = useShadows();
  return (
    <YStack
      bg={t.bg as 'surface'}
      borderWidth={1}
      borderColor="transparent"
      rounded={RADIUS.card}
      p="4"
      gap="2"
      style={[{ boxShadow: shadow[lift && tone === 'plain' ? 'lg' : t.shadow] }, style]}
      {...props}
    >
      {children}
    </YStack>
  );
}
