import { InvalidTransitionError, type LifecycleState, pendingQuestion, transition } from './lifecycle';

const today = '2026-11-17';

function state(overrides: Partial<LifecycleState> = {}): LifecycleState {
  return {
    id: 'sub',
    status: 'active',
    paymentMethod: 'revolut',
    amountCents: 999,
    periodUnit: 'month',
    periodCount: 1,
    anchorDay: 20,
    nextChargeDate: '2026-11-20',
    trialEndDate: null,
    postTrialAmountCents: null,
    periodEndDate: null,
    marginOverrideBp: null,
    archived: false,
    cancelDone: false,
    ...overrides,
  };
}

const trial = () => state({ status: 'trial', trialEndDate: '2026-11-20', postTrialAmountCents: 999, nextChargeDate: '2026-11-20' });

describe('transition', () => {
  it('garder un essai le passe en actif au montant d’après essai', () => {
    const result = transition(trial(), { type: 'keep_trial' }, today);
    expect(result.statusChange).toEqual({ from: 'trial', to: 'active' });
    expect(result.state).toMatchObject({ status: 'active', amountCents: 999, nextChargeDate: '2026-11-20', trialEndDate: null });
  });

  it('résilier un essai le passe directement en résilié', () => {
    expect(transition(trial(), { type: 'cancel_trial' }, today).state.status).toBe('cancelled');
  });

  it('arrêter un abonnement actif exige une fin de période non passée', () => {
    expect(transition(state(), { type: 'stop', periodEndDate: '2026-12-19' }, today).state).toMatchObject({
      status: 'to_cancel',
      periodEndDate: '2026-12-19',
    });
    expect(() => transition(state(), { type: 'stop', periodEndDate: '2026-11-01' }, today)).toThrow(InvalidTransitionError);
  });

  it('annuler la décision revient à actif', () => {
    const stopped = state({ status: 'to_cancel', periodEndDate: '2026-12-19', cancelDone: true });
    expect(transition(stopped, { type: 'undo_stop' }, today).state).toMatchObject({
      status: 'active',
      periodEndDate: null,
      cancelDone: false,
    });
  });

  it('ne passe en résilié qu’une fois la résiliation confirmée', () => {
    const stopped = state({ status: 'to_cancel', periodEndDate: '2026-11-10' });
    expect(() => transition(stopped, { type: 'finalize_cancel' }, today)).toThrow(InvalidTransitionError);
    const confirmed = transition(stopped, { type: 'confirm_cancel_done' }, today);
    expect(confirmed.statusChange).toBeNull();
    expect(transition(confirmed.state, { type: 'finalize_cancel' }, today).state.status).toBe('cancelled');
  });

  it('réactive un abonnement résilié avec une nouvelle date', () => {
    const cancelled = state({ status: 'cancelled', cancelDone: true });
    expect(transition(cancelled, { type: 'reactivate', nextChargeDate: '2026-12-05' }, today).state).toMatchObject({
      status: 'active',
      nextChargeDate: '2026-12-05',
      cancelDone: false,
    });
  });

  it('refuse les transitions incohérentes', () => {
    expect(() => transition(state(), { type: 'keep_trial' }, today)).toThrow(InvalidTransitionError);
    expect(() => transition(state(), { type: 'reactivate', nextChargeDate: '2026-12-01' }, today)).toThrow(InvalidTransitionError);
  });
});

describe('pendingQuestion', () => {
  it('pose la question J+1 sur un essai sans décision', () => {
    expect(pendingQuestion(trial(), '2026-11-20', 'unfunded')).toBeNull();
    expect(pendingQuestion(trial(), '2026-11-21', 'unfunded')).toEqual({ kind: 'trial_outcome' });
    expect(pendingQuestion(trial(), '2026-11-21', 'failed')).toBeNull();
  });

  it('demande confirmation ou résilie automatiquement en fin de période', () => {
    const stopped = state({ status: 'to_cancel', periodEndDate: '2026-11-30' });
    expect(pendingQuestion(stopped, '2026-11-30', null)).toBeNull();
    expect(pendingQuestion(stopped, '2026-12-01', null)).toEqual({ kind: 'cancel_confirmation' });
    expect(pendingQuestion({ ...stopped, cancelDone: true }, '2026-12-01', null)).toEqual({ kind: 'auto_cancel' });
  });
});
