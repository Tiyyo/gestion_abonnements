import { describe, expect, it } from 'vitest';
import { isPriceIncrease, parsePriceChange, priceAlertActive, priceChangeBp, priceChangePayload } from './price-change';

const parse = (payload: Record<string, unknown>) => parsePriceChange(JSON.stringify(payload));

describe('parsePriceChange', () => {
  it('relit une charge utile complète', () => {
    expect(parse(priceChangePayload(1199, 1299, 'reconciliation', false, 'c1'))).toEqual({
      from: 1199,
      to: 1299,
      source: 'reconciliation',
      applied: false,
      chargeId: 'c1',
      dismissedAt: null,
    });
    expect(
      parse({
        ...priceChangePayload(1199, 1299, 'manual', true),
        dismissedAt: '2026-11-20T10:00:00Z',
      }),
    ).toMatchObject({
      source: 'manual',
      applied: true,
      chargeId: null,
      dismissedAt: '2026-11-20T10:00:00Z',
    });
  });

  it('accepte les anciens événements : source déduite de chargeId, considérés comme appliqués', () => {
    expect(parse({ from: 1199, to: 1299 })).toMatchObject({
      source: 'manual',
      applied: true,
    });
    expect(parse({ chargeId: 'c1', from: 1199, to: 1299 })).toMatchObject({
      source: 'reconciliation',
      applied: true,
    });
  });

  it('écarte les charges utiles illisibles', () => {
    expect(parse({})).toBeNull();
    expect(parse({ from: '1199', to: 1299 })).toBeNull();
    expect(parse({ from: 1199, to: 1199 })).toBeNull();
    expect(parse({ from: -1, to: 1199 })).toBeNull();
    expect(parsePriceChange('pas du json')).toBeNull();
    expect(parsePriceChange('null')).toBeNull();
  });
});

describe('priceAlertActive', () => {
  const increase = parse(priceChangePayload(1199, 1299, 'manual', true))!;

  it('dure 30 jours à partir du changement', () => {
    expect(priceAlertActive(increase, '2026-11-01', '2026-11-01')).toBe(true);
    expect(priceAlertActive(increase, '2026-11-01', '2026-11-30')).toBe(true);
    expect(priceAlertActive(increase, '2026-11-01', '2026-12-01')).toBe(false);
    expect(priceAlertActive(increase, '2026-11-02', '2026-11-01')).toBe(false);
  });

  it('ignore les baisses, les écarts non reportés et les alertes masquées', () => {
    expect(priceAlertActive(parse(priceChangePayload(1299, 1199, 'manual', true))!, '2026-11-01', '2026-11-02')).toBe(false);
    const pending = parse(priceChangePayload(1199, 1299, 'reconciliation', false, 'c1'))!;
    expect(isPriceIncrease(pending)).toBe(false);
    expect(priceAlertActive(pending, '2026-11-01', '2026-11-02')).toBe(false);
    expect(priceAlertActive({ ...increase, dismissedAt: '2026-11-02T08:00:00Z' }, '2026-11-01', '2026-11-02')).toBe(false);
  });
});

describe('priceChangeBp', () => {
  it('arrondit au dixième de pour cent', () => {
    expect(priceChangeBp(1199, 1299)).toBe(830);
    expect(priceChangeBp(1000, 900)).toBe(-1000);
    expect(priceChangeBp(0, 500)).toBeNull();
  });
});
