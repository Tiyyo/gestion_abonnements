/**
 * Montant à coller dans le champ de saisie de Revolut : nombre nu avec virgule décimale (« 8,03 »),
 * sans symbole ni séparateur de milliers. Un montant négatif ou invalide donne « 0,00 ».
 */
export function clipboardAmount(cents: number): string {
  const safe = Number.isInteger(cents) && cents > 0 ? cents : 0;
  return `${Math.floor(safe / 100)},${String(safe % 100).padStart(2, '0')}`;
}
