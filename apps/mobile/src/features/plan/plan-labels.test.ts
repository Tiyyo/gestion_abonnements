import { formatEuros } from '@abonnements/core';
import type { PlanTransfer, PlanTrial } from '@/db/repositories/plan/types';
import { formatPercentBp } from '@/lib/format';
import {
  chargeLine,
  hasTrialRisk,
  paydayLineLabel,
  remainingTransfersCents,
  transferAccessibilityLabel,
  trialMessage,
} from './plan-labels';

const transfer = (overrides: Partial<PlanTransfer> = {}): PlanTransfer => ({
  id: 't1',
  plannedDate: '2026-11-09',
  effectiveDate: '2026-11-09',
  rescheduled: false,
  amountCents: 1030,
  done: false,
  chargeIds: [],
  charges: [],
  ...overrides,
});

const trial = (overrides: Partial<PlanTrial> = {}): PlanTrial => ({
  subscriptionId: 's1',
  name: 'Netflix',
  dueDate: '2026-11-12',
  amountCents: 1399,
  risk: true,
  projectedCents: 2000,
  ...overrides,
});

describe('paydayLineLabel', () => {
  it('affiche la marge globale pour les prélèvements', () => {
    expect(paydayLineLabel({ kind: 'charges', subscriptionId: null, name: null, amountCents: 1 }, 300)).toBe(
      `Prélèvements du mois (marge ${formatPercentBp(300)})`,
    );
  });

  it('nomme les provisions et compléments', () => {
    expect(paydayLineLabel({ kind: 'provision', subscriptionId: 's', name: 'Assurance', amountCents: 1 }, 300)).toBe(
      'Provision (Assurance)',
    );
    expect(paydayLineLabel({ kind: 'complement', subscriptionId: 's', name: null, amountCents: 1 }, 300)).toBe('Complément (?)');
  });
});

describe('chargeLine', () => {
  const charge = { name: 'Spotify', expectedAmountCents: 1099, marginBp: 250 };

  it('date le prélèvement avec le jour de la semaine, même au lendemain du transfert', () => {
    expect(chargeLine({ ...charge, dueDate: '2026-11-10' })).toBe(
      `Prélèvement mar.\u00a010\u00a0nov. · ${formatEuros(1099)} + ${formatPercentBp(250)}`,
    );
    expect(chargeLine({ ...charge, dueDate: '2026-11-12' })).toBe(
      `Prélèvement jeu.\u00a012\u00a0nov. · ${formatEuros(1099)} + ${formatPercentBp(250)}`,
    );
  });
});

describe('remainingTransfersCents', () => {
  it('additionne les transferts qui restent à faire', () => {
    expect(remainingTransfersCents([transfer({ amountCents: 500 }), transfer({ amountCents: 700, done: true }), transfer()])).toBe(1530);
    expect(remainingTransfersCents([])).toBe(0);
  });
});

describe('essais', () => {
  it('détecte un essai à risque', () => {
    expect(hasTrialRisk([trial({ risk: false }), trial()])).toBe(true);
    expect(hasTrialRisk([trial({ risk: false })])).toBe(false);
  });

  it('explique un essai qui pourrait passer', () => {
    expect(trialMessage(trial())).toBe(
      `Netflix (${formatEuros(1399)}) pourrait passer le 12\u00a0nov. : le compte aura environ ${formatEuros(2000)}. Décide avant, ou reporte le transfert de ce jour-là.`,
    );
  });

  it('explique un essai qui échouera, avec un solde jamais négatif', () => {
    expect(trialMessage(trial({ risk: false, projectedCents: -300 }))).toBe(
      `Netflix (${formatEuros(1399)}) dépasse le solde prévu de ${formatEuros(0)}, il échouera.`,
    );
  });
});

describe('transferAccessibilityLabel', () => {
  const charges = [{ name: 'Netflix', dueDate: '2026-11-10', expectedAmountCents: 1000, marginBp: 300 }];

  it('lit date, prélèvements, montant et état', () => {
    expect(transferAccessibilityLabel(transfer({ charges }))).toBe(
      `Transfert du lundi\u00a09\u00a0novembre, Netflix, ${formatEuros(1030)}. À faire.`,
    );
  });

  it('mentionne un report et un transfert fait', () => {
    const label = transferAccessibilityLabel(transfer({ charges, rescheduled: true, plannedDate: '2026-11-06', done: true }));
    expect(label).toContain('Reporté, prévu le vendredi\u00a06\u00a0novembre.');
    expect(label).toMatch(/Fait\.$/);
  });
});
