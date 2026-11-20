import type { MonthPlan, PlanTransfer, PlanTransferCharge, PlanTrial } from '@/db/repositories/plan/types';
import { dayMarkers, defaultSelectedDay, monthDayItems, resolveSelectedDay, type DayItem } from './calendar-items';

const due = (name: string, dueDate: string, expectedAmountCents: number): PlanTransferCharge => ({
  name,
  dueDate,
  expectedAmountCents,
  marginBp: 300,
});

const transfer = (overrides: Partial<PlanTransfer> = {}): PlanTransfer => ({
  id: 't1',
  plannedDate: '2026-11-26',
  effectiveDate: '2026-11-26',
  rescheduled: false,
  amountCents: 1442,
  done: false,
  chargeIds: ['c1'],
  charges: [due('Netflix', '2026-11-27', 1399)],
  ...overrides,
});

const trial = (overrides: Partial<PlanTrial> = {}): PlanTrial => ({
  subscriptionId: 's9',
  name: 'Canal+',
  dueDate: '2026-11-27',
  amountCents: 2499,
  risk: true,
  projectedCents: 3000,
  ...overrides,
});

const plan = (start: string, end: string, overrides: Partial<MonthPlan> = {}): MonthPlan => ({
  period: { start, end },
  globalMarginBp: 300,
  payday: { date: start, transferId: null, done: false, totalCents: 5000, lines: [] },
  transfers: [],
  trials: [],
  residualCents: null,
  ...overrides,
});

const kinds = (items: DayItem[] | undefined) => (items ?? []).map((i) => i.kind);

describe('monthDayItems', () => {
  it('range chaque élément à sa date : paie, transfert à sa date effective, prélèvement à son échéance, essai', () => {
    const november = plan('2026-11-25', '2026-12-24', { transfers: [transfer()], trials: [trial()] });
    const items = monthDayItems([november], 2026, 11);
    expect([...items.keys()].sort()).toEqual(['2026-11-25', '2026-11-26', '2026-11-27']);
    expect(kinds(items.get('2026-11-25'))).toEqual(['payday']);
    expect(kinds(items.get('2026-11-26'))).toEqual(['transfer']);
    expect(items.get('2026-11-27')).toEqual([
      { kind: 'charge', name: 'Netflix', amountCents: 1399, fundedOn: '2026-11-26', funded: false },
      { kind: 'trial', trial: trial() },
    ]);
  });

  it('réunit les deux périodes de paie qui recouvrent le mois civil et ignore le reste', () => {
    const october = plan('2026-10-23', '2026-11-25', {
      transfers: [
        transfer({ id: 'old', effectiveDate: '2026-10-30', chargeIds: ['c0'], charges: [due('Spotify', '2026-10-31', 1099)] }),
        transfer({ id: 'early', effectiveDate: '2026-11-09', chargeIds: ['c2'], done: true, charges: [due('Free', '2026-11-10', 1999)] }),
      ],
    });
    const november = plan('2026-11-25', '2026-12-24', {
      transfers: [
        transfer(),
        transfer({ id: 'dec', effectiveDate: '2026-12-03', chargeIds: ['c3'], charges: [due('iCloud', '2026-12-04', 299)] }),
      ],
    });
    const items = monthDayItems([october, november], 2026, 11);
    expect([...items.keys()].sort()).toEqual(['2026-11-09', '2026-11-10', '2026-11-25', '2026-11-26', '2026-11-27']);
    expect(items.get('2026-11-10')).toEqual([{ kind: 'charge', name: 'Free', amountCents: 1999, fundedOn: '2026-11-09', funded: true }]);
  });

  it('garde un prélèvement du mois financé par un transfert du mois précédent', () => {
    const november = plan('2026-11-25', '2026-12-24', {
      transfers: [transfer({ effectiveDate: '2026-11-30', charges: [due('Netflix', '2026-12-01', 1399)] })],
    });
    const items = monthDayItems([november], 2026, 12);
    expect([...items.keys()]).toEqual(['2026-12-01']);
    expect(kinds(items.get('2026-12-01'))).toEqual(['charge']);
  });

  it('écarte les doublons quand le même plan est passé deux fois', () => {
    const november = plan('2026-11-25', '2026-12-24', { transfers: [transfer()], trials: [trial()] });
    const items = monthDayItems([november, november], 2026, 11);
    expect(kinds(items.get('2026-11-25'))).toEqual(['payday']);
    expect(kinds(items.get('2026-11-26'))).toEqual(['transfer']);
    expect(kinds(items.get('2026-11-27'))).toEqual(['charge', 'trial']);
  });

  it('ordonne un jour chargé : paie, transferts, prélèvements, essais', () => {
    const november = plan('2026-11-27', '2026-12-24', {
      trials: [trial()],
      transfers: [
        transfer({ id: 'a', effectiveDate: '2026-11-26' }),
        transfer({ id: 'b', effectiveDate: '2026-11-27', chargeIds: [], charges: [] }),
      ],
    });
    expect(kinds(monthDayItems([november], 2026, 11).get('2026-11-27'))).toEqual(['payday', 'transfer', 'charge', 'trial']);
  });
});

describe('dayMarkers', () => {
  const todo: DayItem = { kind: 'transfer', transfer: transfer() };
  const done: DayItem = { kind: 'transfer', transfer: transfer({ id: 't2', done: true }) };
  const charge: DayItem = { kind: 'charge', name: 'Netflix', amountCents: 1399, fundedOn: '2026-11-26', funded: false };
  const payday: DayItem = { kind: 'payday', plan: plan('2026-11-25', '2026-12-24') };
  const ending: DayItem = { kind: 'trial', trial: trial() };

  it('ne répète pas un repère et distingue transfert fait et à faire', () => {
    expect(dayMarkers([])).toEqual([]);
    expect(dayMarkers([charge, charge])).toEqual(['charge']);
    expect(dayMarkers([done, todo])).toEqual(['transfer_todo', 'transfer_done']);
  });

  it('garde les trois repères les plus importants', () => {
    expect(dayMarkers([payday, done, todo, charge, ending])).toEqual(['trial', 'transfer_todo', 'payday']);
  });
});

describe('defaultSelectedDay', () => {
  const items = new Map<string, DayItem[]>([
    ['2026-12-14', []],
    ['2026-12-03', []],
  ]);

  it('choisit aujourd’hui quand il est dans le mois affiché', () => {
    expect(defaultSelectedDay(2026, 11, '2026-11-20', items)).toBe('2026-11-20');
  });

  it('sinon le premier jour qui a un élément, sinon le 1er du mois', () => {
    expect(defaultSelectedDay(2026, 12, '2026-11-20', items)).toBe('2026-12-03');
    expect(defaultSelectedDay(2027, 1, '2026-11-20', new Map())).toBe('2027-01-01');
  });
});

describe('resolveSelectedDay', () => {
  it('garde le choix dans le mois affiché et l’oublie en changeant de mois', () => {
    expect(resolveSelectedDay('2026-11-05', 2026, 11, '2026-11-20', new Map())).toBe('2026-11-05');
    expect(resolveSelectedDay('2026-11-05', 2026, 12, '2026-11-20', new Map())).toBe('2026-12-01');
    expect(resolveSelectedDay(null, 2026, 11, '2026-11-20', new Map())).toBe('2026-11-20');
  });
});
