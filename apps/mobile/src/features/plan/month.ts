/** Année et mois (1 à 12) d'une date `YYYY-MM-DD`. */
export function monthOf(date: string): [number, number] {
  return [Number(date.slice(0, 4)), Number(date.slice(5, 7))];
}

/** Décale un mois (1 à 12) de `delta` mois, en passant d'une année à l'autre. */
export function shiftMonth(year: number, month: number, delta: number): [number, number] {
  const index = year * 12 + (month - 1) + delta;
  return [Math.floor(index / 12), (index % 12) + 1];
}
