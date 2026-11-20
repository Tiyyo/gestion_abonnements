import { stepChart } from './price-chart';
import {
  buildPriceHistory,
  changeAccessibilityLabel,
  changeAmounts,
  changeCaption,
  changeDelta,
  chartAccessibilityLabel,
  formatSignedEuros,
  priceLevels,
  priceSummary,
  type PriceEventSource,
} from './price-history';

const event = (id: string, date: string, payload: Record<string, unknown>, type = 'price_change'): PriceEventSource => ({
  id,
  type,
  occurred_on: date,
  created_at: `${date}T10:00:0${id.length}Z`,
  payload: JSON.stringify(payload),
});

const monthly = { period_unit: 'month', period_count: 1 } as const;

const events = [
  event('e3', '2026-09-01', { from: 1399, to: 1299, source: 'manual', applied: true }),
  event('e2', '2026-06-15', { chargeId: 'c2', from: 1299, to: 1399, source: 'reconciliation', applied: true }),
  event('e1', '2026-03-12', { from: 1199, to: 1299 }),
  event('ponctuel', '2026-07-15', { chargeId: 'c3', from: 1399, to: 1899, source: 'reconciliation', applied: false }),
  event('illisible', '2026-08-01', { from: 'x', to: 1299 }),
  event('statut', '2026-01-01', { from: null, to: 'active' }, 'status_change'),
];

describe('buildPriceHistory', () => {
  const history = buildPriceHistory(events);

  it('garde les changements appliqués, du plus ancien au plus récent', () => {
    expect(history.map((h) => h.id)).toEqual(['e1', 'e2', 'e3']);
    expect(history[0]).toEqual({
      id: 'e1',
      date: '2026-03-12',
      fromCents: 1199,
      toCents: 1299,
      diffCents: 100,
      diffBp: 830,
      direction: 'up',
      source: 'manual',
    });
    expect(history[2]).toMatchObject({ direction: 'down', diffCents: -100, diffBp: -710 });
  });

  it('départage deux changements du même jour par leur horodatage', () => {
    const sameDay = buildPriceHistory([
      event('bb', '2026-03-12', { from: 1299, to: 1399 }),
      event('a', '2026-03-12', { from: 1199, to: 1299 }),
    ]);
    expect(sameDay.map((h) => h.id)).toEqual(['a', 'bb']);
  });

  it('donne les paliers du graphique', () => {
    expect(priceLevels(history)).toEqual([1199, 1299, 1399, 1299]);
    expect(priceLevels([])).toEqual([]);
  });

  it('formate une ligne', () => {
    expect(changeAmounts(history[0]!)).toBe(`11,99 € → 12,99 €`);
    expect(changeDelta(history[0]!)).toBe(`+1,00 € · +8,3 %`);
    expect(changeDelta(history[2]!)).toBe(`−1,00 € · −7,1 %`);
    expect(changeCaption(history[1]!)).toBe('15\u00a0juin\u00a02026 · constaté au rapprochement');
    expect(changeAccessibilityLabel(history[0]!)).toBe(`Hausse du 12\u00a0mars\u00a02026 : de 11,99 € à 12,99 €, +1,00 €, +8,3 %`);
    expect(chartAccessibilityLabel(history)).toBe(`Évolution du prix : de 11,99 € à 12,99 € en 3 changements`);
  });

  it('omet le pourcentage quand l’ancien prix était nul', () => {
    const [free] = buildPriceHistory([event('e', '2026-03-12', { from: 0, to: 500 })]);
    expect(changeDelta(free!)).toBe(`+5,00 €`);
  });
});

describe('priceSummary', () => {
  it('résume l’écart depuis le premier changement et son effet annuel selon la périodicité', () => {
    const history = buildPriceHistory(events);
    expect(priceSummary(history, monthly)).toBe(`+1,00 € depuis le 12\u00a0mars\u00a02026, soit +12,00 € par an`);
    expect(priceSummary(history, { period_unit: 'year', period_count: 1 })).toBe(`+1,00 € depuis le 12\u00a0mars\u00a02026, soit +1,00 € par an`);
    expect(priceSummary(history, { period_unit: 'week', period_count: 1 })).toContain(`soit +52,00 € par an`);
  });

  it('gère une baisse, un retour au prix d’origine et l’absence de changement', () => {
    const down = buildPriceHistory([event('e', '2026-03-12', { from: 1299, to: 1099 })]);
    expect(priceSummary(down, monthly)).toBe(`−2,00 € depuis le 12\u00a0mars\u00a02026, soit −24,00 € par an`);
    const back = buildPriceHistory([
      event('a', '2026-03-12', { from: 1199, to: 1299 }),
      event('bb', '2026-04-12', { from: 1299, to: 1199 }),
    ]);
    expect(priceSummary(back, monthly)).toBe('Prix revenu à son niveau d’origine depuis le 12\u00a0mars\u00a02026');
    expect(priceSummary([], monthly)).toBeNull();
  });
});

describe('formatSignedEuros', () => {
  it('ajoute le signe', () => {
    expect(formatSignedEuros(200)).toBe(`+2,00 €`);
    expect(formatSignedEuros(-150)).toBe(`−1,50 €`);
    expect(formatSignedEuros(0)).toBe(`0,00 €`);
  });
});

describe('stepChart', () => {
  const box = { width: 300, height: 60, pad: 5 };

  it('trace un palier par prix, le plus haut en haut', () => {
    expect(stepChart([1000, 1200, 1100], box)).toEqual({
      path: 'M5 55 H101.7 V5 H198.3 V30 H295',
      end: { x: 295, y: 30 },
    });
  });

  it('centre un prix constant et refuse moins de deux paliers ou une boîte trop petite', () => {
    expect(stepChart([1000, 1000], box)?.path).toBe('M5 30 H150 V30 H295');
    expect(stepChart([1000], box)).toBeNull();
    expect(stepChart([], box)).toBeNull();
    expect(stepChart([1000, 1200], { width: 0, height: 60, pad: 5 })).toBeNull();
  });
});
