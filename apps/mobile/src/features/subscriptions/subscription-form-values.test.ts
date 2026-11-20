import { addDays, formatEuros } from '@abonnements/core';
import type { SubscriptionRow } from '@/db/repositories/subscriptions';
import {
  DEFAULT_TRIAL_DAYS,
  editSubscriptionDefaults,
  fundedChargesWarning,
  newSubscriptionDefaults,
  toNewSubscriptionInput,
  toSubscriptionEdit,
  touchesPlan,
} from './subscription-form-values';

const today = '2026-11-20';

const row = {
  id: 's1',
  name: 'Canal+',
  status: 'active',
  amount_cents: 2599,
  post_trial_amount_cents: null,
  period_unit: 'month',
  period_count: 3,
  next_charge_date: '2026-12-05',
  trial_end_date: null,
  category_id: 'cat-video',
  icon_key: 'tag',
  cancel_url: null,
  margin_override_bp: null,
  payment_method: 'revolut',
  notes: null,
  category_name: 'Vidéo',
} as unknown as SubscriptionRow;

describe('newSubscriptionDefaults', () => {
  it('démarre un essai de trente jours sans paramètre', () => {
    const values = newSubscriptionDefaults({}, today);
    expect(values.status).toBe('trial');
    expect(values.firstChargeDate).toBe(addDays(today, DEFAULT_TRIAL_DAYS));
  });

  it('passe en actif avec une date fournie, ramenée à aujourd’hui si elle est passée', () => {
    expect(newSubscriptionDefaults({ date: '2026-12-01' }, today)).toMatchObject({ status: 'active', firstChargeDate: '2026-12-01' });
    expect(newSubscriptionDefaults({ date: '2026-11-01', name: 'X', amount: '4,99' }, today)).toMatchObject({
      status: 'active',
      firstChargeDate: today,
      name: 'X',
      amount: '4,99',
    });
  });
});

describe('editSubscriptionDefaults', () => {
  it('convertit la ligne en valeurs de formulaire', () => {
    expect(editSubscriptionDefaults(row)).toMatchObject({
      amount: '25,99',
      periodicity: 'quarter',
      status: 'active',
      firstChargeDate: '2026-12-05',
      iconKey: null,
      cancelUrl: '',
      notes: '',
    });
  });

  it('montre le montant après essai et la fin d’essai', () => {
    const trial = { ...row, status: 'trial', post_trial_amount_cents: 999, trial_end_date: '2026-12-01' } as SubscriptionRow;
    expect(editSubscriptionDefaults(trial)).toMatchObject({ amount: '9,99', status: 'trial', firstChargeDate: '2026-12-01' });
  });
});

describe('conversions vers le domaine', () => {
  const values = { ...editSubscriptionDefaults(row), cancelUrl: '', notes: '  ' };

  it('construit la saisie d’un nouvel abonnement', () => {
    expect(toNewSubscriptionInput(values, null)).toMatchObject({ amountCents: 2599, periodUnit: 'month', periodCount: 3, cancelUrl: null });
  });

  it('construit une modification et détecte ce qui touche au plan', () => {
    const edit = toSubscriptionEdit(values);
    expect(edit).toMatchObject({ amountCents: 2599, date: '2026-12-05', notes: null });
    expect(touchesPlan(edit, row)).toBe(false);
    expect(touchesPlan({ ...edit, amountCents: 2999 }, row)).toBe(true);
    expect(touchesPlan({ ...edit, date: '2026-12-06' }, row)).toBe(true);
  });
});

describe('fundedChargesWarning', () => {
  it('liste les prélèvements déjà alimentés', () => {
    expect(fundedChargesWarning([{ due_date: '2026-12-05', funded_amount_cents: 2677 }])).toBe(
      `Le prélèvement du 5\u00a0déc. est déjà alimenté (${formatEuros(2677)}) : il ne change pas.\nLes prélèvements suivants seront recalculés.`,
    );
  });
});
