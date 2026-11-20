import { pendingPriceChange } from './pending-price-change';

const event = (id: string, payload: Record<string, unknown>) => ({ id, payload: JSON.stringify(payload) });

describe('pendingPriceChange', () => {
  it('prend l’écart en attente le plus récent pour ce montant', () => {
    const events = [
      event('e3', { chargeId: 'c3', from: 1199, to: 1399, source: 'reconciliation', applied: false }),
      event('e2', { chargeId: 'c2', from: 1199, to: 1299, source: 'reconciliation', applied: false }),
      event('e1', { chargeId: 'c1', from: 1199, to: 1299, source: 'reconciliation', applied: false }),
    ];
    expect(pendingPriceChange(events, 1299)).toMatchObject({ id: 'e2', payload: { chargeId: 'c2' } });
  });

  it('ignore les changements déjà appliqués et les anciens événements sans indicateur', () => {
    const events = [
      event('e2', { from: 1199, to: 1299, source: 'manual', applied: true }),
      event('e1', { chargeId: 'c1', from: 1199, to: 1299 }),
    ];
    expect(pendingPriceChange(events, 1299)).toBeNull();
  });
});
