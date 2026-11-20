import { formatEuros } from '@abonnements/core';
import type { HomeData, HomeUpcoming } from '@/db/repositories/home/types';
import type { PlanTransfer, PlanTrial } from '@/db/repositories/plan/types';
import {
  dayOfMonth,
  heroDateLabel,
  monthShort,
  pendingTransfersCents,
  reviewCaption,
  transferPurpose,
  trialBody,
  trialEndLabel,
  upcomingCaption,
  whenLabel,
} from './home-wording';

const transfer = (amountCents: number, charges: { name: string; dueDate: string }[] = []): PlanTransfer => ({
  id: 't1',
  plannedDate: '2026-11-20',
  effectiveDate: '2026-11-20',
  rescheduled: false,
  amountCents,
  done: false,
  chargeIds: [],
  charges: charges.map((c) => ({ ...c, expectedAmountCents: 0, marginBp: 300 })),
});

const upcoming = (over: Partial<HomeUpcoming>): HomeUpcoming => ({
  chargeId: 'c1',
  subscriptionId: 's1',
  name: 'Netflix',
  dueDate: '2026-11-21',
  amountCents: 1399,
  fundedAmountCents: 1441,
  transferDate: null,
  funded: false,
  ...over,
});

describe('libellés de l’Accueil', () => {
  it('écrit la date du jour en toutes lettres', () => {
    expect(heroDateLabel('2026-11-20')).toBe('vendredi 20 novembre');
  });

  it('décrit l’objet d’un transfert', () => {
    const t = transfer(2000, [
      { name: 'Netflix', dueDate: '2026-11-21' },
      { name: 'Spotify', dueDate: '2026-12-03' },
    ]);
    expect(transferPurpose(t)).toBe('Coffre → compte principal, pour Netflix, Spotify (prélevé le 21, le 3)');
  });

  it('dit aujourd’hui, demain ou le jour de la semaine', () => {
    expect(whenLabel('2026-11-20', '2026-11-20')).toMatch(/^aujourd’hui /);
    expect(whenLabel('2026-11-21', '2026-11-20')).toMatch(/^demain /);
    expect(whenLabel('2026-11-24', '2026-11-20')).not.toMatch(/^(aujourd’hui|demain)/);
  });

  it('compte les jours avant la fin d’un essai', () => {
    expect(trialEndLabel('2026-11-25', '2026-11-20')).toBe('fin dans 5 jours');
    expect(trialEndLabel('2026-11-21', '2026-11-20')).toBe('fin demain');
    expect(trialEndLabel('2026-11-20', '2026-11-20')).toBe('fin aujourd’hui');
  });

  it('prévient du risque qu’un essai soit prélevé', () => {
    const trial: PlanTrial = {
      subscriptionId: 's1',
      name: 'Canal+',
      dueDate: '2026-11-25',
      amountCents: 2499,
      risk: false,
      projectedCents: 0,
    };
    expect(trialBody(trial)).toContain('Non financé');
    expect(trialBody({ ...trial, risk: true, projectedCents: 3000 })).toContain(`environ ${formatEuros(3000)}`);
  });

  it('pose la bonne question sur un prélèvement à vérifier', () => {
    const review = { chargeId: 'c1', subscriptionId: 's1', name: 'Netflix', dueDate: '2026-11-18', expectedAmountCents: 1399 };
    expect(reviewCaption({ ...review, wanted: true })).toMatch(/passé ou échoué \?$/);
    expect(reviewCaption({ ...review, wanted: false })).toMatch(/non financé, a-t-il échoué \?$/);
  });

  it('résume le financement d’un prochain prélèvement', () => {
    expect(upcomingCaption(upcoming({ funded: true }))).toBe(`Alimenté · ${formatEuros(1441)}`);
    expect(upcomingCaption(upcoming({ transferDate: '2026-11-20' }))).toBe(`Transfert ven. 20 nov. · ${formatEuros(1441)}`);
    expect(upcomingCaption(upcoming({}))).toBe('Pas de transfert prévu');
  });

  it('découpe la date d’un prélèvement', () => {
    expect(dayOfMonth('2026-08-03')).toBe(3);
    expect(monthShort('2026-08-03')).toBe('août');
  });

  it('additionne les transferts en retard et le prochain', () => {
    const data = { overdue: [transfer(500), transfer(300)], next: transfer(200) } as HomeData;
    expect(pendingTransfersCents(data)).toBe(1000);
    expect(pendingTransfersCents({ ...data, next: null })).toBe(800);
    expect(pendingTransfersCents(undefined)).toBe(0);
  });
});
