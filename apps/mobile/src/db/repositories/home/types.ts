import type { NewEvent } from '@abonnements/core';
import type { BankHint, UnexpectedDebitRow } from '@/db/repositories/bank-transactions';
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
  /** Réponse suggérée par la lecture du compte, s'il y en a une. */
  bank: BankHint | null;
}

/** Débit vu sur le compte et rattaché à aucun prélèvement, classé comme un prélèvement inconnu saisi à la main (10.5). */
export interface HomeUnexpectedDebit extends UnexpectedDebitRow {
  /** Nom prérempli dans la saisie : celui de l'abonnement reconnu, sinon le libellé du relevé. */
  name: string;
  kind: NewEvent['type'] | 'matches_charge';
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

/** Hausse de prix récente d'un abonnement actif, à garder ou à résilier. */
export interface HomePriceAlert {
  eventId: string;
  subscriptionId: string;
  name: string;
  fromCents: number;
  toCents: number;
  occurredOn: string;
  annualImpactCents: number;
  nextChargeDate: string;
}

export interface HomeData {
  overdue: PlanTransfer[];
  next: PlanTransfer | null;
  questions: HomeQuestion[];
  trials: PlanTrial[];
  toReview: HomeReview[];
  unexpectedDebits: HomeUnexpectedDebit[];
  priceAlerts: HomePriceAlert[];
  upcoming: HomeUpcoming[];
  isEmpty: boolean;
}

/** Prélèvement ouvert (prévu, financé ou non financé) d'un abonnement non archivé, avec son nom. */
export type HomeChargeRow = Charge & { name: string; subscription_status: SubscriptionStatus };
