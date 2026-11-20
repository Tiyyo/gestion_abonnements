import { formatEuros } from '@abonnements/core';
import type { HomeData, HomeUpcoming } from '@/db/repositories/home/types';
import type { PlanTransfer, PlanTrial } from '@/db/repositories/plan/types';
import {
  dayOfMonth,
  heroDateLabel,
  pendingTransfersCents,
  priceAlertBody,
  priceAlertTitle,
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

describe('alerte de hausse de prix', () => {
  const alert = {
    eventId: 'e1',
    subscriptionId: 's1',
    name: 'Spotify',
    fromCents: 1199,
    toCents: 1299,
    occurredOn: '2026-11-18',
    annualImpactCents: 1200,
    nextChargeDate: '2026-11-21',
  };

  it('annonce l’écart en euros et en pourcentage, puis l’effet annuel', () => {
    expect(priceAlertTitle(alert)).toBe(`Spotify : +1,00\u202f€ (+8,3\u202f%)`);
    expect(priceAlertBody(alert)).toBe(`Passé de 11,99\u202f€ à 12,99\u202f€ le 18\u00a0nov., soit +12,00\u202f€ par an.`);
  });

  it('omet le pourcentage quand l’ancien prix était nul', () => {
    expect(priceAlertTitle({ ...alert, fromCents: 0, toCents: 500 })).toBe(`Spotify : +5,00\u202f€`);
  });
});

describe('libellés de l’Accueil', () => {
  it('écrit la date du jour en toutes lettres', () => {
    expect(heroDateLabel('2026-11-20')).toBe('vendredi\u00a020\u00a0novembre');
  });

  it('décrit l’objet d’un transfert', () => {
    const t = transfer(2000, [
      { name: 'Netflix', dueDate: '2026-11-21' },
      { name: 'Spotify', dueDate: '2026-12-03' },
    ]);
    expect(transferPurpose(t)).toBe('Coffre → compte principal, pour Netflix, Spotify (prélevé le 21\u00a0nov., le 3\u00a0déc.)');
  });

  it('dit aujourd’hui, demain ou le jour de la semaine', () => {
    expect(whenLabel('2026-11-20', '2026-11-20')).toBe('aujourd’hui 20\u00a0nov.');
    expect(whenLabel('2026-11-21', '2026-11-20')).toBe('demain 21\u00a0nov.');
    expect(whenLabel('2026-11-24', '2026-11-20')).toBe('mar.\u00a024\u00a0nov.');
  });

  it('compte les jours avant la fin d’un essai', () => {
    expect(trialEndLabel('2026-11-25', '2026-11-20')).toBe('fin dans 5\u00a0jours');
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
    const review = { chargeId: 'c1', subscriptionId: 's1', name: 'Netflix', dueDate: '2026-11-18', expectedAmountCents: 1399, bank: null };
    expect(reviewCaption({ ...review, wanted: true })).toMatch(/passé ou échoué \?$/);
    expect(reviewCaption({ ...review, wanted: false })).toMatch(/non financé, a-t-il échoué \?$/);
  });

  it('reprend ce que la banque a vu pour un prélèvement à vérifier', () => {
    const review = {
      chargeId: 'c1',
      subscriptionId: 's1',
      name: 'Netflix',
      dueDate: '2026-11-18',
      expectedAmountCents: 1399,
      wanted: true,
    };
    const debit = { kind: 'debit' as const, transactionId: 't1', amountCents: 1499, date: '2026-11-19', label: 'NETFLIX.COM' };
    expect(reviewCaption({ ...review, bank: debit })).toBe(`Débit de ${formatEuros(1499)} vu le 19\u00a0nov. · à confirmer`);
    expect(reviewCaption({ ...review, bank: { kind: 'no_debit', through: '2026-11-25' } })).toBe(
      'Prévu le 18\u00a0nov. · aucun débit vu, échoué ?',
    );
  });

  it('résume le financement d’un prochain prélèvement', () => {
    expect(upcomingCaption(upcoming({ funded: true }))).toBe(`Alimenté · ${formatEuros(1441)}`);
    expect(upcomingCaption(upcoming({ transferDate: '2026-11-20' }))).toBe(`Transfert ven.\u00a020\u00a0nov. · ${formatEuros(1441)}`);
    expect(upcomingCaption(upcoming({}))).toBe('Pas de transfert prévu');
  });

  it('découpe la date d’un prélèvement', () => {
    expect(dayOfMonth('2026-08-03')).toBe(3);
  });

  it('additionne les transferts en retard et le prochain', () => {
    const data = { overdue: [transfer(500), transfer(300)], next: transfer(200) } as HomeData;
    expect(pendingTransfersCents(data)).toBe(1000);
    expect(pendingTransfersCents({ ...data, next: null })).toBe(800);
    expect(pendingTransfersCents(undefined)).toBe(0);
  });
});
