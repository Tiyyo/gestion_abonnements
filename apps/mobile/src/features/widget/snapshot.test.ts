import { buildWidgetSnapshot, frameFor, namesLabel, WIDGET_MAX_TRANSFERS, type WidgetTransfer } from './snapshot';

const today = '2026-11-20';
const spotify: WidgetTransfer = { date: '2026-11-24', amountCents: 1235, names: ['Spotify'] };
const bundle: WidgetTransfer = { date: '2026-12-01', amountCents: 4120, names: ['Netflix', 'iCloud+'] };

describe('namesLabel', () => {
  it('liste jusqu’à trois noms, sans doublon', () => {
    expect(namesLabel(['Netflix', 'Spotify', 'Netflix'])).toBe('Netflix, Spotify');
    expect(namesLabel(['A', 'B', 'C'])).toBe('A, B, C');
  });

  it('résume au-delà de trois noms', () => {
    expect(namesLabel(['A', 'B', 'C', 'D'])).toBe('A, B et 2 autres');
  });
});

describe('buildWidgetSnapshot', () => {
  it('sans transfert prévu : une seule image « Rien à transférer »', () => {
    expect(buildWidgetSnapshot([], today)).toEqual({
      version: 1,
      frames: [
        {
          from: today,
          state: 'empty',
          caption: '',
          headline: 'Rien à transférer',
          detail: 'Aucun transfert prévu',
          label: 'Rien à transférer.',
        },
      ],
    });
  });

  it('prochain transfert : date, montant et abonnements financés', () => {
    const frame = buildWidgetSnapshot([bundle, spotify], today).frames[0];
    expect(frame).toEqual({
      from: today,
      state: 'next',
      caption: 'Mar. 24 nov',
      headline: '12,35 €',
      detail: 'Pour Spotify',
      label: 'Prochain transfert, mar. 24 nov : 12,35 € du coffre vers le compte. Pour Spotify.',
    });
  });

  it('prévoit la veille, le jour même et le retard sans rouvrir l’app', () => {
    const snapshot = buildWidgetSnapshot([spotify], today);
    expect(snapshot.frames.map((f) => [f.from, f.state, f.caption])).toEqual([
      ['2026-11-20', 'next', 'Mar. 24 nov'],
      ['2026-11-23', 'next', 'Demain · 24 nov'],
      ['2026-11-24', 'next', 'Aujourd’hui · 24 nov'],
      ['2026-11-25', 'overdue', 'En retard · 24 nov'],
    ]);
    expect(frameFor(snapshot, '2026-11-22')?.caption).toBe('Mar. 24 nov');
    expect(frameFor(snapshot, '2026-11-24')?.caption).toBe('Aujourd’hui · 24 nov');
    expect(frameFor(snapshot, '2027-03-01')?.state).toBe('overdue');
    expect(frameFor(snapshot, '2026-11-19')).toBeNull();
  });

  it('un transfert en retard passe avant le prochain', () => {
    const late: WidgetTransfer = { date: '2026-11-18', amountCents: 999, names: ['Disney+'] };
    const frame = buildWidgetSnapshot([spotify, late], today).frames[0];
    expect(frame.state).toBe('overdue');
    expect(frame.caption).toBe('En retard · 18 nov');
    expect(frame.headline).toBe('9,99 €');
    expect(frame.detail).toBe('Pour Disney+');
    expect(frame.label).toBe('Transfert en retard depuis le 18 nov : 9,99 € du coffre vers le compte. Pour Disney+.');
  });

  it('cumule les retards au fil des jours', () => {
    const snapshot = buildWidgetSnapshot([spotify, bundle], today);
    const last = frameFor(snapshot, '2026-12-02');
    expect(last).toMatchObject({
      from: '2026-12-02',
      state: 'overdue',
      caption: '2 en retard',
      headline: '53,55 €',
      detail: 'Pour Spotify, Netflix, iCloud+',
    });
    expect(last?.label).toContain('2 transferts en retard');
    // Entre les deux échéances, le premier retard reste affiché sans image en double.
    expect(snapshot.frames.filter((f) => f.caption === 'En retard · 24 nov')).toHaveLength(1);
    expect(frameFor(snapshot, '2026-11-30')?.caption).toBe('En retard · 24 nov');
  });

  it('transfert du jour ou du lendemain dès la première image', () => {
    expect(buildWidgetSnapshot([{ ...spotify, date: today }], today).frames[0].caption).toBe('Aujourd’hui · 20 nov');
    expect(buildWidgetSnapshot([{ ...spotify, date: '2026-11-21' }], today).frames[0].caption).toBe('Demain · 21 nov');
  });

  it('transfert sans prélèvement rattaché : libellé générique', () => {
    expect(buildWidgetSnapshot([{ ...spotify, names: [] }], today).frames[0].detail).toBe('Coffre → compte');
  });

  it('borne le nombre de transferts suivis', () => {
    const many = Array.from({ length: 60 }, (_, i) => ({
      date: `2027-01-${String((i % 28) + 1).padStart(2, '0')}`,
      amountCents: 100,
      names: ['A'],
    }));
    const snapshot = buildWidgetSnapshot(many, today);
    expect(snapshot.frames.length).toBeLessThanOrEqual(WIDGET_MAX_TRANSFERS * 3 + 1);
    expect(snapshot.frames[0].state).toBe('next');
  });
});
