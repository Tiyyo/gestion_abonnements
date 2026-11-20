import type { PaydayPeriod } from '@abonnements/core';

export interface PaydayBreakdownLine {
  kind: 'charges' | 'provision' | 'complement';
  subscriptionId: string | null;
  name: string | null;
  amountCents: number;
}

export interface PaydayView {
  date: string;
  transferId: string | null;
  done: boolean;
  totalCents: number;
  lines: PaydayBreakdownLine[];
}

export interface PlanTransferCharge {
  name: string;
  dueDate: string;
  expectedAmountCents: number;
  marginBp: number;
}

export interface PlanTransfer {
  id: string;
  plannedDate: string;
  effectiveDate: string;
  rescheduled: boolean;
  amountCents: number;
  done: boolean;
  chargeIds: string[];
  charges: PlanTransferCharge[];
}

export interface PlanTrial {
  subscriptionId: string;
  name: string;
  dueDate: string;
  amountCents: number;
  risk: boolean;
  projectedCents: number;
}

export interface MonthPlan {
  period: PaydayPeriod;
  globalMarginBp: number;
  payday: PaydayView;
  transfers: PlanTransfer[];
  trials: PlanTrial[];
  residualCents: number | null;
}
