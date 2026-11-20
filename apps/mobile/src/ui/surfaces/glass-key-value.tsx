import { XStack } from 'tamagui';
import { Amount, Caption } from '@/ui/text/typography';

/** Ligne libellé → valeur dans une `GlassCard`, séparée de ce qui précède par un filet de verre. */
export function GlassKeyValue({ label, value }: { label: string; value: string }) {
  return (
    <XStack minH={44} py="2.5" gap="4" items="center" justify="space-between" borderTopWidth={1} borderColor="glassEdge">
      <Caption color="onGlassMuted" shrink={1}>
        {label}
      </Caption>
      <Amount color="onGlass" text="right" shrink={1}>
        {value}
      </Amount>
    </XStack>
  );
}
