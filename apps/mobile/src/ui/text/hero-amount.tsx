import { formatEuros } from '@abonnements/core';
import { Display } from './typography';

/** Grand montant en verre : euros en blanc, « ,27 € » plus petit et atténué. */
export function HeroAmount({ cents }: { cents: number | null }) {
  if (cents === null) {
    return (
      <Display color="onGlassMuted" accessibilityLabel="Montant indisponible">
        —
      </Display>
    );
  }
  const text = formatEuros(cents);
  const comma = text.lastIndexOf(',');
  return (
    <Display color="onGlass" accessibilityLabel={text}>
      {text.slice(0, comma)}
      <Display fontSize={22} color="onGlassMuted">
        {text.slice(comma)}
      </Display>
    </Display>
  );
}
