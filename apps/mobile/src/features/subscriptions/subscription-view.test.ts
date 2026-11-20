import type { SubscriptionRow } from '@/db/repositories/subscriptions';
import {
  buildSubscriptionView,
  comparatorFor,
  DEFAULT_SORT,
  matchesQuery,
  noMatchMessage,
  SEARCH_SORT_THRESHOLD,
  sortLabel,
  type SubscriptionSort,
} from './subscription-view';

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

const ids = (rows: readonly SubscriptionRow[]) => rows.map((r) => r.id);

describe('matchesQuery', () => {
  const canal = { name: 'Canal+ Séries', category_name: 'Vidéo à la demande' };
  it.each([
    ['', true],
    ['   ', true],
    ['canal', true],
    ['CANAL+', true],
    ['series', true],
    ['SÉRIES', true],
    ['video', true],
    ['vidéo demande', true],
    ['canal video', true],
    ['  canal   series ', true],
    ['nal+ sé', true],
    ['musique', false],
    ['canal musique', false],
  ])('« %s » → %s', (query, expected) => {
    expect(matchesQuery(canal, query)).toBe(expected);
  });
});

describe('comparatorFor', () => {
  const rows = [
    row({ id: 'annuel', name: 'Écho', next_charge_date: '2026-11-25', period_unit: 'year', amount_cents: 6000 }),
    row({ id: 'mensuel', name: 'Zed', next_charge_date: '2026-12-10', amount_cents: 1500 }),
    row({ id: 'trimestriel', name: 'arte', next_charge_date: '2026-12-05', period_count: 3, amount_cents: 6000 }),
    row({ id: 'hebdo', name: 'Bob', next_charge_date: '2026-12-05', period_unit: 'week', amount_cents: 500 }),
  ];
  it.each<[SubscriptionSort, boolean, string[]]>([
    ['next_charge', false, ['annuel', 'trimestriel', 'hebdo', 'mensuel']],
    ['monthly_amount', false, ['hebdo', 'trimestriel', 'mensuel', 'annuel']],
    ['name', false, ['trimestriel', 'hebdo', 'annuel', 'mensuel']],
    ['next_charge', true, ['trimestriel', 'hebdo', 'annuel', 'mensuel']],
    ['monthly_amount', true, ['hebdo', 'trimestriel', 'mensuel', 'annuel']],
    ['name', true, ['trimestriel', 'hebdo', 'annuel', 'mensuel']],
  ])('tri %s (résiliés : %s)', (sort, cancelled, expected) => {
    expect(ids([...rows].sort(comparatorFor(sort, cancelled)))).toEqual(expected);
  });

  it('départage les montants égaux par le nom', () => {
    const equal = [row({ id: 'b', name: 'Zed' }), row({ id: 'a', name: 'Arte' })];
    expect(ids(equal.sort(comparatorFor('monthly_amount')))).toEqual(['a', 'b']);
  });
});

describe('sortLabel', () => {
  it.each<[SubscriptionSort, string]>([
    ['next_charge', 'Prochain prélèvement'],
    ['monthly_amount', 'Montant mensuel'],
    ['name', 'Nom'],
  ])('%s → %s', (sort, label) => {
    expect(sortLabel(sort)).toBe(label);
  });
});

describe('noMatchMessage', () => {
  it('cite la recherche entre guillemets avec espaces insécables', () => {
    expect(noMatchMessage('netflx')).toBe('Aucun abonnement ne correspond à « netflx ».');
  });
});

describe('buildSubscriptionView', () => {
  const rows = [
    row({ id: 'netflix', name: 'Netflix', amount_cents: 1399, next_charge_date: '2026-12-03' }),
    row({ id: 'spotify', name: 'Spotify', category_name: 'Musique', amount_cents: 1099, next_charge_date: '2026-11-28' }),
    row({ id: 'deezer', name: 'Deezer', category_name: 'Musique', status: 'cancelled' }),
    row({ id: 'canal', name: 'Canal+', status: 'to_cancel', amount_cents: 2499 }),
    row({ id: 'arte', name: 'Arte', status: 'trial', amount_cents: 499 }),
    row({ id: 'molotov', name: 'Molotov', status: 'cancelled', amount_cents: 599 }),
    row({ id: 'prime', name: 'Prime Vidéo', period_unit: 'year', amount_cents: 6990, next_charge_date: '2026-11-22' }),
  ];
  const shape = (query: string, sort: SubscriptionSort = DEFAULT_SORT, source = rows) => {
    const view = buildSubscriptionView(source, { query, sort });
    return { groups: view.groups.map((g) => [g.status, ids(g.rows)]), cancelled: ids(view.cancelled), noMatch: view.noMatch };
  };

  it('sans recherche, groupe par statut et trie par échéance', () => {
    expect(shape('')).toEqual({
      groups: [
        ['to_cancel', ['canal']],
        ['trial', ['arte']],
        ['active', ['prime', 'spotify', 'netflix']],
      ],
      cancelled: ['deezer', 'molotov'],
      noMatch: false,
    });
  });

  it.each<[string, SubscriptionSort, string[], string[]]>([
    ['', 'monthly_amount', ['netflix', 'spotify', 'prime'], ['deezer', 'molotov']],
    ['', 'name', ['netflix', 'prime', 'spotify'], ['deezer', 'molotov']],
    ['musique', 'next_charge', ['spotify'], ['deezer']],
    ['VIDEO', 'name', ['netflix', 'prime'], ['molotov']],
    ['video', 'monthly_amount', ['netflix', 'prime'], ['molotov']],
    ['molo', 'next_charge', [], ['molotov']],
  ])('recherche « %s », tri %s', (query, sort, active, cancelled) => {
    const view = buildSubscriptionView(rows, { query, sort });
    expect(ids(view.groups.find((g) => g.status === 'active')?.rows ?? [])).toEqual(active);
    expect(ids(view.cancelled)).toEqual(cancelled);
  });

  it('signale une recherche sans résultat et garde la requête nettoyée', () => {
    const view = buildSubscriptionView(rows, { query: '  inconnu ', sort: DEFAULT_SORT });
    expect(view).toMatchObject({ toolsVisible: true, searching: true, query: 'inconnu', noMatch: true, groups: [], cancelled: [] });
  });

  it('ne considère pas des espaces comme une recherche', () => {
    expect(buildSubscriptionView(rows, { query: '   ', sort: DEFAULT_SORT })).toMatchObject({ searching: false, noMatch: false });
  });

  it('ignore recherche et tri tant que le seuil n’est pas dépassé', () => {
    const few = rows.slice(0, SEARCH_SORT_THRESHOLD);
    const view = buildSubscriptionView(few, { query: 'musique', sort: 'name' });
    expect(view).toMatchObject({ toolsVisible: false, searching: false, query: '', noMatch: false });
    expect(shape('musique', 'name', few)).toEqual(shape('', DEFAULT_SORT, few));
    expect(buildSubscriptionView(rows.slice(0, SEARCH_SORT_THRESHOLD + 1), { query: '', sort: DEFAULT_SORT }).toolsVisible).toBe(true);
  });
});
