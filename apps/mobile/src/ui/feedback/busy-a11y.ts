/** Accessibilité d'une zone en cours de chargement : un seul élément annoncé « Chargement… », ses blocs fantômes sont masqués. */
export const BUSY_A11Y = {
  accessible: true,
  accessibilityLabel: 'Chargement…',
  accessibilityState: { busy: true },
} as const;
