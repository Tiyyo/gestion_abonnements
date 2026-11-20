import { buildHistory, provisionedSince } from './detail-history';

describe('buildHistory', () => {
  const events = [
    { id: 'e1', occurred_on: '2026-11-01', created_at: '2026-11-01T08:00:00Z' },
    { id: 'e2', occurred_on: '2026-11-10', created_at: '2026-11-10T09:00:00Z' },
  ];
  const reminders = [
    { id: 'r1', fire_at: '2026-11-10T10:00' },
    { id: 'r2', fire_at: '2026-11-20T09:00' },
    { id: 'r3', fire_at: '2026-11-20T18:00' },
  ];

  it('trie du plus récent au plus ancien et départage par horodatage', () => {
    expect(buildHistory(events, reminders, '2026-11-20T12:00').map((h) => h.id)).toEqual(['r2', 'r1', 'e2', 'e1']);
  });

  it('ignore les rappels pas encore envoyés', () => {
    expect(buildHistory([], reminders, '2026-11-20T08:59').map((h) => h.id)).toEqual(['r1']);
  });

  it('date un rappel par le jour de son envoi', () => {
    const [item] = buildHistory([], [reminders[0]], '2026-11-20T00:00');
    expect(item).toMatchObject({ kind: 'reminder', date: '2026-11-10', sort: '2026-11-10T10:00' });
  });
});

describe('provisionedSince', () => {
  const provisions = [
    { due_date: '2026-09-01', funded_amount_cents: 100 },
    { due_date: '2026-10-01', funded_amount_cents: 200 },
    { due_date: '2026-11-01', funded_amount_cents: 300 },
  ];

  it('cumule tout sans prélèvement payé', () => {
    expect(provisionedSince(provisions, null)).toBe(600);
  });

  it('ne garde que les provisions postérieures au dernier paiement', () => {
    expect(provisionedSince(provisions, '2026-10-01')).toBe(300);
  });
});
