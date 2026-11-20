import type { PlanTransfer, PlanTrial } from '@/db/repositories/plan/types';
import type { Charge, SubscriptionStatus } from '@/db/types';

export interface HomeQuestion {
  kind: 'trial_outcome' | 'cancel_confirmation';
  subscriptionId: string;
  name: string;
  date: string;
  amountCents: number;
  chargeId: string | null;
  cancelUrl: string | null;
}

export interface HomeReview {
  chargeId: string;
  subscriptionId: string;
  name: string;
  dueDate: string;
  expectedAmountCents: number;
  wanted: boolean;
}

export interface HomeUpcoming {
  chargeId: string;
  subscriptionId: string;
  name: string;
  dueDate: string;
  amountCents: number;
  fundedAmountCents: number;
  transferDate: string | null;
  funded: boolean;
}

export interface HomeData {
  overdue: PlanTransfer[];
  next: PlanTransfer | null;
  questions: HomeQuestion[];
  trials: PlanTrial[];
  toReview: HomeReview[];
  upcoming: HomeUpcoming[];
  isEmpty: boolean;
}

/** Prélèvement ouvert (prévu, financé ou non financé) d'un abonnement non archivé, avec son nom. */
export type HomeChargeRow = Charge & { name: string; subscription_status: SubscriptionStatus };
