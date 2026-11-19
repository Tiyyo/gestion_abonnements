import { addDays, diffDays, type IsoDate } from './calendar';
import type { ChargeStatus, PeriodUnit, SubscriptionStatus } from './types';

export type DebitEventType = 'price_change' | 'unexpected_charge' | 'duplicate' | 'post_cancel_charge' | 'charge_failed';

export interface NewEvent {
  type: DebitEventType;
  subscriptionId: string | null;
  occurredOn: IsoDate;
  amountCents: number | null;
  payload: Record<string, unknown>;
}

export interface ReconcilableCharge {
  id: string;
  subscriptionId: string;
  dueDate: IsoDate;
  status: ChargeStatus;
  expectedAmountCents: number;
  fundedAmountCents: number;
}

export class ReconciliationError extends Error {}

const OPEN: ReadonlySet<ChargeStatus> = new Set(['planned', 'funded', 'unfunded']);

export function needsReview(charge: ReconcilableCharge & { provisionOnly: boolean }, today: IsoDate): boolean {
  return !charge.provisionOnly && OPEN.has(charge.status) && diffDays(charge.dueDate, today) > 0;
}

export interface PaidOutcome {
  status: 'paid';
  actualAmountCents: number;
  actualDate: IsoDate;
  events: NewEvent[];
  proposeAmountUpdate: boolean;
}

export function markPaid(charge: ReconcilableCharge, actualAmountCents: number, actualDate: IsoDate): PaidOutcome {
  if (!OPEN.has(charge.status)) {
    throw new ReconciliationError(`prélèvement déjà rapproché : ${charge.id}`);
  }
  const events: NewEvent[] = [];
  const priceChanged = actualAmountCents !== charge.expectedAmountCents;
  if (priceChanged) {
    events.push({
      type: 'price_change',
      subscriptionId: charge.subscriptionId,
      occurredOn: actualDate,
      amountCents: null,
      payload: { chargeId: charge.id, from: charge.expectedAmountCents, to: actualAmountCents },
    });
  }
  if (charge.status === 'unfunded') {
    events.push({
      type: 'unexpected_charge',
      subscriptionId: charge.subscriptionId,
      occurredOn: actualDate,
      amountCents: actualAmountCents,
      payload: { chargeId: charge.id },
    });
  }
  return { status: 'paid', actualAmountCents, actualDate, events, proposeAmountUpdate: priceChanged };
}

export type FailedChoice = { kind: 'merchant_will_retry' } | { kind: 'give_up' };

export interface FailedOutcome {
  status: 'planned' | 'funded' | 'failed';
  reviewAgainOn: IsoDate | null;
  correctiveTransferCents: number;
  events: NewEvent[];
}

export function markFailed(
  charge: ReconcilableCharge,
  choice: FailedChoice,
  today: IsoDate,
  newAmountCents: number | null = null,
): FailedOutcome {
  if (charge.status !== 'funded' && charge.status !== 'planned') {
    throw new ReconciliationError(`seul un prélèvement voulu peut échouer : ${charge.id}`);
  }
  const correctiveTransferCents =
    newAmountCents !== null && newAmountCents > charge.fundedAmountCents ? newAmountCents - charge.fundedAmountCents : 0;

  if (choice.kind === 'merchant_will_retry') {
    return { status: charge.status, reviewAgainOn: addDays(today, 3), correctiveTransferCents, events: [] };
  }
  return {
    status: 'failed',
    reviewAgainOn: null,
    correctiveTransferCents: 0,
    events: [
      {
        type: 'charge_failed',
        subscriptionId: charge.subscriptionId,
        occurredOn: today,
        amountCents: null,
        payload: { chargeId: charge.id },
      },
    ],
  };
}

export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export interface KnownSubscription {
  id: string;
  name: string;
  status: SubscriptionStatus;
  periodUnit: PeriodUnit;
  periodCount: number;
}

export interface UnknownDebit {
  name: string;
  amountCents: number;
  date: IsoDate;
}

export type UnknownDebitClassification =
  | { kind: 'matches_charge'; chargeId: string }
  | { kind: 'event'; event: NewEvent; offerCreateSubscription: boolean };

export const MATCH_TOLERANCE_DAYS = 3;

function periodDays(unit: PeriodUnit, count: number): number {
  return (unit === 'week' ? 7 : unit === 'month' ? 30 : 365) * count;
}

export function classifyUnknownDebit(
  debit: UnknownDebit,
  subscriptions: readonly KnownSubscription[],
  charges: readonly (ReconcilableCharge & { actualDate: IsoDate | null })[],
): UnknownDebitClassification {
  const target = normalizeName(debit.name);
  const subscription = subscriptions.find((s) => normalizeName(s.name) === target);
  const event = (type: DebitEventType): UnknownDebitClassification => ({
    kind: 'event',
    event: { type, subscriptionId: subscription?.id ?? null, occurredOn: debit.date, amountCents: debit.amountCents, payload: {} },
    offerCreateSubscription: type === 'unexpected_charge' && !subscription,
  });

  if (!subscription) {
    return event('unexpected_charge');
  }
  const own = charges.filter((c) => c.subscriptionId === subscription.id);
  const open = own.find((c) => OPEN.has(c.status) && Math.abs(diffDays(c.dueDate, debit.date)) <= MATCH_TOLERANCE_DAYS);
  if (open) {
    return { kind: 'matches_charge', chargeId: open.id };
  }
  if (subscription.status === 'cancelled') {
    return event('post_cancel_charge');
  }
  const halfPeriod = periodDays(subscription.periodUnit, subscription.periodCount) / 2;
  const recentlyPaid = own.some(
    (c) => c.status === 'paid' && c.actualDate !== null && Math.abs(diffDays(c.actualDate, debit.date)) < halfPeriod,
  );
  return event(recentlyPaid ? 'duplicate' : 'unexpected_charge');
}
