import type { IsoDate } from './calendar';
import type { ChargeStatus, ExpectedCharge } from './types';

export interface StoredCharge {
  id: string;
  subscriptionId: string;
  dueDate: IsoDate;
  provisionOnly: boolean;
  status: ChargeStatus;
  expectedAmountCents: number;
  fundedAmountCents: number;
  isTrialConversion: boolean;
}

export interface ChargeUpdate {
  id: string;
  expectedAmountCents: number;
  fundedAmountCents: number;
  status: ExpectedCharge['status'];
  isTrialConversion: boolean;
}

export interface RegenerationPlan {
  create: ExpectedCharge[];
  update: ChargeUpdate[];
  remove: string[];
  skip: string[];
}

const FROZEN: ReadonlySet<ChargeStatus> = new Set(['paid', 'failed', 'skipped']);

const key = (subscriptionId: string, dueDate: IsoDate) => `${subscriptionId}|${dueDate}`;

export function planRegeneration(subscriptionId: string, stored: readonly StoredCharge[], expected: readonly ExpectedCharge[]): RegenerationPlan {
  const existing = new Map(
    stored.filter((c) => c.subscriptionId === subscriptionId && !c.provisionOnly).map((c) => [key(c.subscriptionId, c.dueDate), c]),
  );
  const plan: RegenerationPlan = { create: [], update: [], remove: [], skip: [] };
  const seen = new Set<string>();

  for (const charge of expected) {
    const k = key(charge.subscriptionId, charge.dueDate);
    seen.add(k);
    const current = existing.get(k);
    if (!current) {
      plan.create.push(charge);
      continue;
    }
    if (FROZEN.has(current.status) || current.status === 'funded') {
      continue;
    }
    const unchanged =
      current.expectedAmountCents === charge.expectedAmountCents &&
      current.fundedAmountCents === charge.fundedAmountCents &&
      current.status === charge.status &&
      current.isTrialConversion === charge.isTrialConversion;
    if (!unchanged) {
      plan.update.push({
        id: current.id,
        expectedAmountCents: charge.expectedAmountCents,
        fundedAmountCents: charge.fundedAmountCents,
        status: charge.status,
        isTrialConversion: charge.isTrialConversion,
      });
    }
  }

  for (const [k, current] of existing) {
    if (seen.has(k) || FROZEN.has(current.status)) {
      continue;
    }
    if (current.status === 'funded') {
      plan.skip.push(current.id);
    } else {
      plan.remove.push(current.id);
    }
  }
  return plan;
}
