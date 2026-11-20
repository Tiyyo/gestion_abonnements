import { formatEuros } from '@abonnements/core';
import { SkeletonLine } from '@/ui/feedback/skeleton-line';
import { GlassPanel } from '@/ui/surfaces/glass-panel';
import { Amount, Caption } from '@/ui/text/typography';

/** Solde d'une poche. `loading` : bloc fantôme de la hauteur du montant ; le tiret reste réservé à l'absence de donnée. */
export function Pocket({ label, cents, loading }: { label: string; cents: number | null; loading?: boolean }) {
  return (
    <GlassPanel accessible accessibilityLabel={`${label} : ${cents === null ? 'indisponible' : formatEuros(cents)}`}>
      <Caption color="onGlassMuted">{label}</Caption>
      {loading ? (
        <SkeletonLine tone="glass" w={76}>
          <Amount fontSize={17} fontWeight="700">
            0
          </Amount>
        </SkeletonLine>
      ) : (
        <Amount fontSize={17} fontWeight="700" color="onGlass">
          {cents === null ? '—' : formatEuros(cents)}
        </Amount>
      )}
    </GlassPanel>
  );
}
