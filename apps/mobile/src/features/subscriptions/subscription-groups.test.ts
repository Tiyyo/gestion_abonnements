import { formatEuros } from '@abonnements/core';
import type { SubscriptionRow } from '@/db/repositories/subscriptions';
import { byNextDate, cancelledByName, groupByStatus, lineSubtitle, periodSuffix } from './subscription-groups';

function row(patch: Partial<SubscriptionRow>): SubscriptionRow {
  return {
    id: 'id',
    name: 'Netflix',
    status: 'active',
    next_charge_date: '2026-12-01',
    trial_end_date: null,
    period_end_date: null,
    period_unit: 'month',
    period_count: 1,
    amount_cents: 1000,
    margin_override_bp: null,
    category_name: 'Vidéo',
    ...patch,
  } as SubscriptionRow;
}

describe('byNextDate', () => {
  it('trie par échéance puis par nom', () => {
    const rows = [row({ id: 'b', name: 'Zed' }), row({ id: 'c', next_charge_date: '2026-11-25' }), row({ id: 'a', name: 'Arte' })];
    expect(rows.sort(byNextDate).map((r) => r.id)).toEqual(['c', 'a', 'b']);
  });
});

describe('groupByStatus', () => {
  it('ordonne les groupes par urgence et omet les groupes vides', () => {
    const groups = groupByStatus([
      row({ id: '1', status: 'active' }),
      row({ id: '2', status: 'to_cancel' }),
      row({ id: '3', status: 'cancelled' }),
    ]);
    expect(groups.map((g) => [g.status, g.rows.map((r) => r.id)])).toEqual([
      ['to_cancel', ['2']],
      ['active', ['1']],
    ]);
  });
});

describe('cancelledByName', () => {
  it('ne garde que les résiliés, par ordre alphabétique', () => {
    const rows = [
      row({ id: '1', name: 'Zed', status: 'cancelled' }),
      row({ id: '2', status: 'active' }),
      row({ id: '3', name: 'Été', status: 'cancelled' }),
    ];
    expect(cancelledByName(rows).map((r) => r.id)).toEqual(['3', '1']);
  });
});

describe('periodSuffix', () => {
  it.each([
    ['week', 1, '/ sem.'],
    ['month', 1, '/ mois'],
    ['month', 3, '/ 3 mois'],
    ['year', 1, '/ an'],
    ['year', 2, '/ 2 ans'],
  ] as const)('%s × %i donne « %s »', (unit, count, label) => {
    expect(periodSuffix({ period_unit: unit, period_count: count })).toBe(label);
  });
});

describe('lineSubtitle', () => {
  it('annonce la fin d’essai ou de période', () => {
    expect(lineSubtitle(row({ status: 'trial', trial_end_date: '2026-12-05' }), 300)).toBe('fin d’essai 5\u00a0déc.');
    expect(lineSubtitle(row({ status: 'to_cancel', period_end_date: null }), 300)).toBe('fin de période 1er\u00a0déc.');
    expect(lineSubtitle(row({ status: 'cancelled' }), 300)).toBe('résilié');
  });

  it('ajoute la provision mensuelle d’un abonnement annuel', () => {
    expect(lineSubtitle(row({ period_unit: 'month' }), 300)).toBe('prochain le 1er\u00a0déc.');
    expect(lineSubtitle(row({ period_unit: 'year', amount_cents: 12000 }), 0)).toBe(
      `prochain le 1er\u00a0déc., provisionné ${formatEuros(1000)}/mois`,
    );
  });
});
