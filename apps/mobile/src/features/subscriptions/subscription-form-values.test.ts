import { addDays, formatEuros } from '@abonnements/core';
import type { SubscriptionRow } from '@/db/repositories/subscriptions';
import {
  DEFAULT_TRIAL_DAYS,
  editSubscriptionDefaults,
  fundedChargesWarning,
  isSubscriptionFormDirty,
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

describe('isSubscriptionFormDirty', () => {
  const created = newSubscriptionDefaults({}, today);
  const loaded = editSubscriptionDefaults(row);

  it('ne voit aucune saisie sur un formulaire intact, à la création comme à la modification', () => {
    expect(isSubscriptionFormDirty(created, { ...created })).toBe(false);
    expect(isSubscriptionFormDirty(loaded, { ...loaded })).toBe(false);
  });

  it('ne voit aucune saisie sur un formulaire prérempli depuis un prélèvement inconnu', () => {
    const prefilled = newSubscriptionDefaults({ name: 'Canal+', amount: '25,99', date: '2026-11-18' }, today);
    expect(isSubscriptionFormDirty(prefilled, { ...prefilled })).toBe(false);
  });

  it('voit une saisie dans un champ texte, y compris les notes et l’adresse de résiliation', () => {
    expect(isSubscriptionFormDirty(created, { ...created, name: 'N' })).toBe(true);
    expect(isSubscriptionFormDirty(created, { ...created, amount: '9' })).toBe(true);
    expect(isSubscriptionFormDirty(loaded, { ...loaded, notes: 'offre de rentrée' })).toBe(true);
    expect(isSubscriptionFormDirty(loaded, { ...loaded, cancelUrl: 'https://exemple.fr' })).toBe(true);
  });

  it('voit un choix fait dans un panneau (catégorie, rythme, logo, marge, date, statut)', () => {
    expect(isSubscriptionFormDirty(created, { ...created, categoryId: 'cat-video' })).toBe(true);
    expect(isSubscriptionFormDirty(created, { ...created, periodicity: 'year' })).toBe(true);
    expect(isSubscriptionFormDirty(created, { ...created, iconKey: 'netflix' })).toBe(true);
    expect(isSubscriptionFormDirty(loaded, { ...loaded, marginOverrideBp: 500 })).toBe(true);
    expect(isSubscriptionFormDirty(loaded, { ...loaded, firstChargeDate: '2026-12-06' })).toBe(true);
    expect(isSubscriptionFormDirty(created, { ...created, status: 'active' })).toBe(true);
  });

  it('oublie une modification annulée à la main', () => {
    expect(isSubscriptionFormDirty(loaded, { ...loaded, name: loaded.name })).toBe(false);
  });

  it('ignore les champs pas encore connus du formulaire', () => {
    expect(isSubscriptionFormDirty(created, {})).toBe(false);
    expect(isSubscriptionFormDirty(created, { name: created.name })).toBe(false);
  });
});
