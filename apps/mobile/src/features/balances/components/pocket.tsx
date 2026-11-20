import { formatEuros } from '@abonnements/core';
import { GlassPanel } from '@/ui/surfaces/glass-panel';
import { Amount, Caption } from '@/ui/text/typography';

export function Pocket({ label, cents }: { label: string; cents: number | null }) {
  return (
    <GlassPanel>
      <Caption color="onGlassMuted">{label}</Caption>
      <Amount fontSize={17} fontWeight="700" color="onGlass">
        {cents === null ? '—' : formatEuros(cents)}
      </Amount>
    </GlassPanel>
  );
}
