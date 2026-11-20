/** Géométrie du graphique de tendance, en points d'écran. */
export const CHART = {
  /** Hauteur de la zone des barres. */
  plotHeight: 132,
  /** Marge au-dessus du plus haut repère, pour que son libellé ne soit pas coupé. */
  topPad: 10,
  /** Bandeau des libellés de mois, sous la ligne de base. */
  labelHeight: 30,
  /** Largeur minimale d'une colonne : c'est la zone tactile. */
  minColumnWidth: 44,
  barWidth: 22,
  barRadius: 4,
  /** Hauteur minimale d'une barre non nulle, pour qu'elle reste visible. */
  minBarHeight: 3,
  /** Largeur de la colonne des libellés en euros, à gauche. */
  axisWidth: 62,
} as const;

export const CHART_HEIGHT = CHART.topPad + CHART.plotHeight + CHART.labelHeight;

const NICE_FACTORS = [2, 4, 6, 8, 10];
const MIN_MAX_CENTS = 1000;

const safe = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0);

/**
 * Plafond « rond » de l'axe, en centimes : 2, 4, 6, 8 ou 10 × une puissance de dix en euros,
 * pour que le repère du milieu tombe lui aussi sur un euro entier. Jamais nul : 10 € au minimum.
 */
export function niceMaxCents(maxCents: number): number {
  const euros = safe(maxCents) / 100;
  if (euros <= MIN_MAX_CENTS / 100) {
    return MIN_MAX_CENTS;
  }
  const magnitude = 10 ** Math.floor(Math.log10(euros));
  const factor = NICE_FACTORS.find((f) => f * magnitude >= euros) ?? 10;
  return Math.round(factor * magnitude * 100);
}

/** Trois repères discrets : zéro, la moitié, le plafond. */
export function gridTicks(maxCents: number): number[] {
  const max = niceMaxCents(maxCents);
  return [0, max / 2, max];
}

/** Ordonnée d'un montant dans le graphique (0 en haut). */
export function yForCents(cents: number, axisMaxCents: number): number {
  const ratio = axisMaxCents > 0 ? Math.min(safe(cents) / axisMaxCents, 1) : 0;
  return CHART.topPad + CHART.plotHeight * (1 - ratio);
}

export interface BarHeights {
  paid: number;
  planned: number;
}

function segmentHeight(cents: number, axisMaxCents: number): number {
  const value = safe(cents);
  if (value === 0 || !(axisMaxCents > 0)) {
    return 0;
  }
  return Math.max(Math.min(value / axisMaxCents, 1) * CHART.plotHeight, CHART.minBarHeight);
}

/** Hauteurs des deux parties d'une barre : payé en bas, prévu au-dessus. Le total ne dépasse jamais la zone. */
export function barHeights(paidCents: number, plannedCents: number, axisMaxCents: number): BarHeights {
  const paid = segmentHeight(paidCents, axisMaxCents);
  const planned = segmentHeight(plannedCents, axisMaxCents);
  const overflow = Math.max(paid + planned - CHART.plotHeight, 0);
  return planned >= paid ? { paid, planned: planned - overflow } : { paid: paid - overflow, planned };
}

/** Largeur d'une colonne : toute la largeur disponible si elle suffit, sinon 44 px et le graphique défile. */
export function columnWidth(availableWidth: number, count: number): number {
  if (count <= 0) {
    return CHART.minColumnWidth;
  }
  return Math.max(Math.floor(safe(availableWidth) / count), CHART.minColumnWidth);
}

const n = (value: number) => Math.round(value * 100) / 100;

/** Tracé d'un rectangle posé sur `bottom`, coins du haut arrondis si `roundTop`. Chaîne vide si la hauteur est nulle. */
export function barPath(x: number, bottom: number, width: number, height: number, roundTop: boolean): string {
  if (!(height > 0) || !(width > 0)) {
    return '';
  }
  const top = bottom - height;
  const r = roundTop ? Math.min(CHART.barRadius, height, width / 2) : 0;
  if (r === 0) {
    return `M${n(x)} ${n(bottom)}V${n(top)}H${n(x + width)}V${n(bottom)}Z`;
  }
  return (
    `M${n(x)} ${n(bottom)}V${n(top + r)}Q${n(x)} ${n(top)} ${n(x + r)} ${n(top)}` +
    `H${n(x + width - r)}Q${n(x + width)} ${n(top)} ${n(x + width)} ${n(top + r)}V${n(bottom)}Z`
  );
}
