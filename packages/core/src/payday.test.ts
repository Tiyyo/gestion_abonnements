import { isProvisioned, paydayPeriodContaining, paydayPlan, type PaydayCharge } from './payday';

const charge = (subscriptionId: string, dueDate: string, fundedAmountCents: number, status = 'planned'): PaydayCharge => ({
  subscriptionId,
  dueDate,
  fundedAmountCents,
  status,
});

const domain = (provisionedCents: number) => ({
  subscriptionId: 'domaine',
  periodMonths: 12,
  charges: [charge('domaine', '2027-03-03', 5150)],
  provisionedCents,
});

describe('paydayPeriodContaining', () => {
  it('reporte la paie du dimanche 1er novembre (Toussaint) au lundi 2', () => {
    expect(paydayPeriodContaining('2026-11-18', 1)).toEqual({ start: '2026-11-02', end: '2026-12-01' });
  });

  it('rattache le 1er novembre à la période d’octobre', () => {
    expect(paydayPeriodContaining('2026-11-01', 1)).toEqual({ start: '2026-10-01', end: '2026-11-02' });
  });

  it('gère une paie le 31 en février', () => {
    expect(paydayPeriodContaining('2027-03-01', 31).start).toBe('2027-03-01');
    expect(paydayPeriodContaining('2027-02-27', 31).start).toBe('2027-02-01');
  });
});

describe('isProvisioned', () => {
  it('provisionne au-delà d’un mois seulement', () => {
    expect(isProvisioned('year', 1)).toBe(true);
    expect(isProvisioned('month', 3)).toBe(true);
    expect(isProvisioned('month', 1)).toBe(false);
    expect(isProvisioned('week', 4)).toBe(false);
  });
});

describe('paydayPlan', () => {
  const november = { start: '2026-11-02', end: '2026-12-01' };
  const monthlyCharges = [
    charge('icloud', '2026-11-19', 308),
    charge('spotify', '2026-11-21', 1235),
    charge('netflix', '2026-11-24', 1390),
    charge('disney', '2026-11-20', 0, 'unfunded'),
    charge('spotify', '2026-12-21', 1235),
  ];

  it('donne 33,63 € en novembre : 29,33 € de prélèvements et 4,30 € de provision', () => {
    const plan = paydayPlan({ period: november, fundingLeadDays: 1, monthlyCharges, provisioned: [domain(0)] });
    expect(plan.totalCents).toBe(3363);
    expect(plan.lines.filter((l) => l.kind === 'charge').map((l) => l.amountCents)).toEqual([308, 1235, 1390]);
    expect(plan.lines.find((l) => l.kind === 'provision')?.amountCents).toBe(430);
  });

  it('rattache une charge du 1er décembre à novembre par sa date de transfert', () => {
    const plan = paydayPlan({
      period: november,
      fundingLeadDays: 1,
      monthlyCharges: [charge('x', '2026-12-01', 500)],
      provisioned: [],
    });
    expect(plan.totalCents).toBe(500);
  });

  it('ne verse que le complément le mois du prélèvement annuel', () => {
    const march = { start: '2027-03-01', end: '2027-04-01' };
    const plan = paydayPlan({ period: march, fundingLeadDays: 1, monthlyCharges: [], provisioned: [domain(4 * 430)] });
    expect(plan.lines).toEqual([
      { kind: 'complement', subscriptionId: 'domaine', dueDate: '2027-03-03', amountCents: 3430 },
    ]);
  });

  it('ne verse rien de plus quand la provision est complète', () => {
    const march = { start: '2027-03-01', end: '2027-04-01' };
    expect(paydayPlan({ period: march, fundingLeadDays: 1, monthlyCharges: [], provisioned: [domain(5160)] }).totalCents).toBe(0);
  });

  it('plafonne la dernière provision au montant restant', () => {
    const plan = paydayPlan({ period: november, fundingLeadDays: 1, monthlyCharges: [], provisioned: [domain(5000)] });
    expect(plan.totalCents).toBe(150);
  });
});
