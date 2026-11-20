import type { ReactNode } from 'react';
import { KeyValue } from '@/ui/surfaces/key-value';

/** Ligne clé-valeur : texte simple ou contenu libre (bouton). */
export function DetailRow({ label, children, last }: { label: string; children: ReactNode; last?: boolean }) {
  return typeof children === 'string' ? (
    <KeyValue label={label} value={children} last={last} />
  ) : (
    <KeyValue label={label} last={last}>
      {children}
    </KeyValue>
  );
}
