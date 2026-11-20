import { toPlanTransfers, type TransferLinkRow, type TransferWithEffective } from './plan-transfers';

const transfer = (id: string, over: Partial<TransferWithEffective> = {}): TransferWithEffective => ({
  id,
  type: 'vault_to_main',
  planned_date: '2026-12-04',
  rescheduled_date: null,
  amount_cents: 2060,
  status: 'planned',
  done_at: null,
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
  effective: '2026-12-04',
  ...over,
});

const link = (transferId: string, chargeId: string, margin: number | null): TransferLinkRow => ({
  transfer_id: transferId,
  charge_id: chargeId,
  name: `Abonnement ${chargeId}`,
  margin_override_bp: margin,
  due_date: '2026-12-05',
  expected_amount_cents: 1000,
});

describe('toPlanTransfers', () => {
  it('rattache à chaque transfert ses prélèvements avec la marge effective', () => {
    const [a, b] = toPlanTransfers(
      [transfer('t1'), transfer('t2', { rescheduled_date: '2026-12-03', effective: '2026-12-03', status: 'done' })],
      [link('t1', 'c1', null), link('t1', 'c2', 100), link('t2', 'c3', null)],
      300,
    );
    expect(a).toMatchObject({ id: 't1', rescheduled: false, done: false, chargeIds: ['c1', 'c2'] });
    expect(a.charges.map((c) => c.marginBp)).toEqual([300, 100]);
    expect(b).toMatchObject({ id: 't2', effectiveDate: '2026-12-03', plannedDate: '2026-12-04', rescheduled: true, done: true });
    expect(b.chargeIds).toEqual(['c3']);
  });
});
