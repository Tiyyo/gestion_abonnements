import type { NewEvent } from '@abonnements/core';
import { relabelAfterCancel } from './review-mapping';

const events: NewEvent[] = [
  { type: 'unexpected_charge', subscriptionId: 's1', occurredOn: '2026-11-20', amountCents: 999, payload: {} },
  { type: 'price_change', subscriptionId: 's1', occurredOn: '2026-11-20', amountCents: 1099, payload: {} },
];

describe('relabelAfterCancel', () => {
  it('requalifie un prélèvement inattendu après résiliation', () => {
    expect(relabelAfterCancel(events, 'cancelled').map((e) => e.type)).toEqual(['post_cancel_charge', 'price_change']);
  });

  it('laisse les événements intacts sinon', () => {
    expect(relabelAfterCancel(events, 'active')).toBe(events);
  });
});
