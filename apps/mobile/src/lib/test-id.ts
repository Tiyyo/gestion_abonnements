/**
 * Fragment de `testID` tiré d'un libellé libre (nom d'abonnement) : minuscules, sans accents,
 * tout le reste en tirets. « Netflix Premium » → `netflix-premium`. Sert aux tests de bout en bout (`e2e/`).
 */
export function testIdSlug(label: string): string {
  return label
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
