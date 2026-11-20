import { barHeights, barPath, CHART, columnWidth, gridTicks, niceMaxCents, yForCents } from './trend-scale';

describe('échelle du graphique de tendance', () => {
  it('arrondit le plafond à une valeur ronde, au-dessus du maximum', () => {
    expect(niceMaxCents(2198)).toBe(4000);
    expect(niceMaxCents(1999)).toBe(2000);
    expect(niceMaxCents(2000)).toBe(2000);
    expect(niceMaxCents(5400)).toBe(6000);
    expect(niceMaxCents(9100)).toBe(10000);
    expect(niceMaxCents(12345)).toBe(20000);
    expect(niceMaxCents(650000)).toBe(800000);
  });

  it('garde un plafond de 10 € sans données ou avec des valeurs invalides', () => {
    expect(niceMaxCents(0)).toBe(1000);
    expect(niceMaxCents(299)).toBe(1000);
    expect(niceMaxCents(-500)).toBe(1000);
    expect(niceMaxCents(Number.NaN)).toBe(1000);
    expect(niceMaxCents(Number.POSITIVE_INFINITY)).toBe(1000);
  });

  it('pose trois repères en euros entiers', () => {
    expect(gridTicks(2198)).toEqual([0, 2000, 4000]);
    expect(gridTicks(0)).toEqual([0, 500, 1000]);
    for (const max of [1, 999, 1001, 4321, 99999, 123456]) {
      const ticks = gridTicks(max);
      expect(ticks[2]).toBeGreaterThanOrEqual(max);
      expect(ticks.every((t) => t % 100 === 0)).toBe(true);
    }
  });

  it('place les montants entre la ligne de base et le haut', () => {
    expect(yForCents(0, 4000)).toBe(CHART.topPad + CHART.plotHeight);
    expect(yForCents(4000, 4000)).toBe(CHART.topPad);
    expect(yForCents(2000, 4000)).toBe(CHART.topPad + CHART.plotHeight / 2);
    expect(yForCents(9000, 4000)).toBe(CHART.topPad);
    expect(yForCents(100, 0)).toBe(CHART.topPad + CHART.plotHeight);
  });

  it('calcule les hauteurs des parties payée et prévue', () => {
    expect(barHeights(2000, 0, 4000)).toEqual({ paid: CHART.plotHeight / 2, planned: 0 });
    expect(barHeights(1000, 1000, 4000)).toEqual({ paid: CHART.plotHeight / 4, planned: CHART.plotHeight / 4 });
    expect(barHeights(0, 0, 4000)).toEqual({ paid: 0, planned: 0 });
  });

  it('garde visible une barre minuscule et ne dépasse jamais la zone', () => {
    expect(barHeights(1, 0, 1000000).paid).toBe(CHART.minBarHeight);
    const full = barHeights(3999, 1, 4000);
    expect(full.paid + full.planned).toBeLessThanOrEqual(CHART.plotHeight);
    expect(full.planned).toBe(CHART.minBarHeight);
    const over = barHeights(9000, 9000, 4000);
    expect(over.paid + over.planned).toBeLessThanOrEqual(CHART.plotHeight);
  });

  it('ne produit jamais NaN sans données', () => {
    const values = [barHeights(0, 0, 0), barHeights(Number.NaN, Number.NaN, 0), barHeights(100, 100, Number.NaN)].flatMap((h) => [
      h.paid,
      h.planned,
    ]);
    expect(values).toEqual([0, 0, 0, 0, 0, 0]);
    expect(Number.isFinite(yForCents(Number.NaN, 0))).toBe(true);
    expect(Number.isFinite(columnWidth(Number.NaN, 12))).toBe(true);
  });

  it('élargit les colonnes si la place suffit, sinon garde 44 px', () => {
    expect(columnWidth(270, 12)).toBe(44);
    expect(columnWidth(720, 12)).toBe(60);
    expect(columnWidth(0, 12)).toBe(44);
    expect(columnWidth(300, 0)).toBe(44);
  });

  it('trace une barre aux coins du haut arrondis', () => {
    expect(barPath(10, 100, 22, 40, true)).toBe('M10 100V64Q10 60 14 60H28Q32 60 32 64V100Z');
    expect(barPath(10, 100, 22, 40, false)).toBe('M10 100V60H32V100Z');
    expect(barPath(10, 100, 22, 2, true)).toBe('M10 100V100Q10 98 12 98H30Q32 98 32 100V100Z');
    expect(barPath(10, 100, 22, 0, true)).toBe('');
    expect(barPath(10, 100, 22, Number.NaN, true)).toBe('');
  });
});
