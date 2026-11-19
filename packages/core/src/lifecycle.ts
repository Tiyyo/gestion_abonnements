import { addDays, compareDates, type IsoDate } from './calendar';
import type { SubscriptionSnapshot, SubscriptionStatus } from './types';

export interface LifecycleState extends SubscriptionSnapshot {
  cancelDone: boolean;
}

export type LifecycleAction =
  | { type: 'keep_trial' }
  | { type: 'cancel_trial' }
  | { type: 'stop'; periodEndDate: IsoDate }
  | { type: 'undo_stop' }
  | { type: 'confirm_cancel_done' }
  | { type: 'finalize_cancel' }
  | { type: 'reactivate'; nextChargeDate: IsoDate };

export interface StatusChange {
  from: SubscriptionStatus;
  to: SubscriptionStatus;
}

export interface TransitionResult {
  state: LifecycleState;
  statusChange: StatusChange | null;
}

export class InvalidTransitionError extends Error {}

function invalid(state: LifecycleState, action: LifecycleAction, reason = ''): never {
  throw new InvalidTransitionError(`transition « ${action.type} » impossible depuis « ${state.status} »${reason ? ` : ${reason}` : ''}`);
}

function moveTo(state: LifecycleState, patch: Partial<LifecycleState> & { status: SubscriptionStatus }): TransitionResult {
  return { state: { ...state, ...patch }, statusChange: { from: state.status, to: patch.status } };
}

export function transition(state: LifecycleState, action: LifecycleAction, today: IsoDate): TransitionResult {
  switch (action.type) {
    case 'keep_trial': {
      if (state.status !== 'trial' || !state.trialEndDate || state.postTrialAmountCents === null) {
        return invalid(state, action);
      }
      return moveTo(state, {
        status: 'active',
        amountCents: state.postTrialAmountCents,
        nextChargeDate: state.trialEndDate,
        trialEndDate: null,
        postTrialAmountCents: null,
      });
    }
    case 'cancel_trial':
      if (state.status !== 'trial') {
        return invalid(state, action);
      }
      return moveTo(state, { status: 'cancelled' });
    case 'stop':
      if (state.status !== 'active') {
        return invalid(state, action);
      }
      if (compareDates(action.periodEndDate, today) < 0) {
        return invalid(state, action, 'la fin de période est passée');
      }
      return moveTo(state, { status: 'to_cancel', periodEndDate: action.periodEndDate, cancelDone: false });
    case 'undo_stop':
      if (state.status !== 'to_cancel') {
        return invalid(state, action);
      }
      return moveTo(state, { status: 'active', periodEndDate: null, cancelDone: false });
    case 'confirm_cancel_done':
      if (state.status !== 'to_cancel') {
        return invalid(state, action);
      }
      return { state: { ...state, cancelDone: true }, statusChange: null };
    case 'finalize_cancel':
      if (state.status !== 'to_cancel' || !state.cancelDone) {
        return invalid(state, action, 'la résiliation chez le marchand n’est pas confirmée');
      }
      return moveTo(state, { status: 'cancelled' });
    case 'reactivate':
      if (state.status !== 'cancelled') {
        return invalid(state, action);
      }
      return moveTo(state, {
        status: 'active',
        nextChargeDate: action.nextChargeDate,
        periodEndDate: null,
        cancelDone: false,
      });
  }
}

export function suggestedPeriodEnd(nextChargeDate: IsoDate): IsoDate {
  return addDays(nextChargeDate, -1);
}

export type PendingQuestion = { kind: 'trial_outcome' } | { kind: 'cancel_confirmation' } | { kind: 'auto_cancel' };

export function pendingQuestion(
  state: LifecycleState,
  today: IsoDate,
  conversionChargeStatus: string | null,
): PendingQuestion | null {
  if (state.status === 'trial' && state.trialEndDate && compareDates(today, state.trialEndDate) > 0) {
    return conversionChargeStatus === 'unfunded' ? { kind: 'trial_outcome' } : null;
  }
  if (state.status === 'to_cancel' && state.periodEndDate && compareDates(today, state.periodEndDate) > 0) {
    return state.cancelDone ? { kind: 'auto_cancel' } : { kind: 'cancel_confirmation' };
  }
  return null;
}
