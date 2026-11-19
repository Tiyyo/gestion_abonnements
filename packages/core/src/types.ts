import type { IsoDate } from './calendar';

export type PeriodUnit = 'week' | 'month' | 'year';
export type SubscriptionStatus = 'trial' | 'active' | 'to_cancel' | 'cancelled';
export type PaymentMethod = 'revolut' | 'other';
export type ChargeStatus = 'planned' | 'funded' | 'paid' | 'failed' | 'unfunded' | 'skipped';

export interface SubscriptionSnapshot {
  id: string;
  status: SubscriptionStatus;
  paymentMethod: PaymentMethod;
  amountCents: number;
  periodUnit: PeriodUnit;
  periodCount: number;
  anchorDay: number | null;
  nextChargeDate: IsoDate;
  trialEndDate: IsoDate | null;
  postTrialAmountCents: number | null;
  periodEndDate: IsoDate | null;
  marginOverrideBp: number | null;
  archived: boolean;
}

export interface ExpectedCharge {
  subscriptionId: string;
  dueDate: IsoDate;
  expectedAmountCents: number;
  fundedAmountCents: number;
  status: Extract<ChargeStatus, 'planned' | 'unfunded'>;
  isTrialConversion: boolean;
}
