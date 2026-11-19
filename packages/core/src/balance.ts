import { compareDates, type IsoDate } from './calendar';
import { effectiveTransferDate } from './funding';
import type { ChargeStatus } from './types';

export interface BalanceTransfer {
  type: 'payday' | 'vault_to_main' | 'residual_return';
  status: 'planned' | 'done' | 'skipped';
  plannedDate: IsoDate;
  rescheduledDate: IsoDate | null;
  doneOn: IsoDate | null;
  amountCents: number;
}

export interface BalanceCharge {
  status: ChargeStatus;
  dueDate: IsoDate;
  fundedAmountCents: number;
  expectedAmountCents: number;
  actualAmountCents: number | null;
  actualDate: IsoDate | null;
  provisionOnly: boolean;
}

export interface BalanceEvent {
  type: string;
  occurredOn: IsoDate;
  amountCents: number | null;
  linkedToCharge: boolean;
}

export interface Ledger {
  transfers: readonly BalanceTransfer[];
  charges: readonly BalanceCharge[];
  events: readonly BalanceEvent[];
}

const DEBIT_EVENTS = new Set(['unexpected_charge', 'duplicate', 'post_cancel_charge']);

const onOrBefore = (date: IsoDate | null, limit: IsoDate) => date !== null && compareDates(date, limit) <= 0;

function sum<T>(items: readonly T[], amount: (item: T) => number): number {
  return items.reduce((total, item) => total + amount(item), 0);
}

export function estimatedBalance(ledger: Ledger, date: IsoDate): number {
  const doneTransfers = (type: BalanceTransfer['type']) =>
    ledger.transfers.filter((t) => t.type === type && t.status === 'done' && onOrBefore(t.doneOn, date));

  return (
    sum(doneTransfers('vault_to_main'), (t) => t.amountCents) -
    sum(
      ledger.charges.filter((c) => c.status === 'paid' && onOrBefore(c.actualDate, date)),
      (c) => c.actualAmountCents ?? 0,
    ) -
    sum(doneTransfers('residual_return'), (t) => t.amountCents) -
    sum(
      ledger.events.filter((e) => DEBIT_EVENTS.has(e.type) && !e.linkedToCharge && onOrBefore(e.occurredOn, date)),
      (e) => e.amountCents ?? 0,
    )
  );
}

export function residualToReturn(ledger: Ledger, date: IsoDate): number {
  const reserved = sum(
    ledger.charges.filter((c) => c.status === 'funded' && !c.provisionOnly),
    (c) => c.fundedAmountCents,
  );
  return Math.max(0, estimatedBalance(ledger, date) - reserved);
}

export function projectedBalance(ledger: Ledger, today: IsoDate, dueDate: IsoDate): number {
  const incoming = sum(
    ledger.transfers.filter(
      (t) => t.type === 'vault_to_main' && t.status === 'planned' && onOrBefore(effectiveTransferDate(t), dueDate),
    ),
    (t) => t.amountCents,
  );
  const consumedBefore = sum(
    ledger.charges.filter(
      (c) =>
        (c.status === 'planned' || c.status === 'funded') &&
        !c.provisionOnly &&
        compareDates(c.dueDate, dueDate) < 0,
    ),
    (c) => c.fundedAmountCents,
  );
  return estimatedBalance(ledger, today) + incoming - consumedBefore;
}

export function forgottenTrialRisk(ledger: Ledger, today: IsoDate, charge: BalanceCharge): boolean {
  if (charge.status !== 'unfunded' || compareDates(charge.dueDate, today) < 0) {
    return false;
  }
  return charge.expectedAmountCents <= projectedBalance(ledger, today, charge.dueDate);
}
