import { formatEuros } from '@abonnements/core';
import type { PlanTransfer } from '@/db/repositories/plan/types';
import type { DayItem } from './calendar-items';
import { chargeDayNote, dayAccessibilityLabel, dayItemsSummary, dayTitle, formatFullDay, trialDayNote } from './calendar-labels';

const transfer = (done: boolean): PlanTransfer => ({
  id: done ? 'done' : 'todo',
  plannedDate: '2026-11-27',
  effectiveDate: '2026-11-27',
  rescheduled: false,
  amountCents: 1442,
  done,
  chargeIds: [],
  charges: [],
});
const todo: DayItem = { kind: 'transfer', transfer: transfer(false) };
const done: DayItem = { kind: 'transfer', transfer: transfer(true) };
const charge: DayItem = { kind: 'charge', name: 'Netflix', amountCents: 1399, fundedOn: '2026-11-26', funded: false };

describe('formatFullDay', () => {
  it('écrit le jour en toutes lettres', () => {
    expect(formatFullDay('2026-11-27')).toBe('vendredi\u00a027\u00a0novembre');
    expect(formatFullDay('2026-11-01')).toBe('dimanche\u00a01er\u00a0novembre');
    expect(formatFullDay('2027-02-08')).toBe('lundi\u00a08\u00a0février');
    expect(dayTitle('2026-11-27')).toBe('Vendredi\u00a027\u00a0novembre');
  });
});

describe('notes du détail du jour', () => {
  it('rattache un prélèvement à son transfert', () => {
    expect(chargeDayNote({ fundedOn: '2026-11-26', funded: false })).toBe('À financer par le transfert du 26\u00a0nov.');
    expect(chargeDayNote({ fundedOn: '2026-11-26', funded: true })).toBe('Financé par le transfert du 26\u00a0nov.');
  });

  it('dit si une fin d’essai risque de passer', () => {
    expect(trialDayNote({ risk: true, projectedCents: 3000 })).toBe(
      `Fin d’essai non financée : pourrait passer, le compte aura environ ${formatEuros(3000)}.`,
    );
    expect(trialDayNote({ risk: false, projectedCents: 0 })).toBe('Fin d’essai non financée : échouera faute de solde.');
  });
});

describe('dayItemsSummary', () => {
  it('compte par nature et accorde le pluriel', () => {
    expect(dayItemsSummary([])).toBe('rien de prévu');
    expect(dayItemsSummary([todo, charge])).toBe('1 transfert à faire, 1 prélèvement');
    expect(dayItemsSummary([done, done, charge, charge])).toBe('2 transferts faits, 2 prélèvements');
  });
});

describe('dayAccessibilityLabel', () => {
  it('annonce la date puis les éléments', () => {
    expect(dayAccessibilityLabel({ date: '2026-11-27', holiday: false }, [todo, charge], '2026-11-20')).toBe(
      'vendredi\u00a027\u00a0novembre, 1 transfert à faire, 1 prélèvement',
    );
  });

  it('signale aujourd’hui et les jours fériés', () => {
    expect(dayAccessibilityLabel({ date: '2026-11-11', holiday: true }, [], '2026-11-11')).toBe(
      'mercredi\u00a011\u00a0novembre, aujourd’hui, jour férié, rien de prévu',
    );
  });
});
