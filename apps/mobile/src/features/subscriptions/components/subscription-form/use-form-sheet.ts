import { useState } from 'react';
import type { SheetKind } from './form-labels';

/** Panneau ouvert (`open`) et dernier contenu montré (`shown`, conservé pendant la fermeture). */
export function useFormSheet() {
  const [open, setOpen] = useState<SheetKind | null>(null);
  const [shown, setShown] = useState<SheetKind>('category');
  return {
    open: open !== null,
    shown,
    show: (kind: SheetKind) => {
      setShown(kind);
      setOpen(kind);
    },
    close: () => setOpen(null),
  };
}
