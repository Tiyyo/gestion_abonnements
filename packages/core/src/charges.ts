import { addDays, addMonthsAnchored, compareDates, type IsoDate, parts } from './calendar';
import { effectiveMarginBp, fundedAmountCents } from './money';
import type { ExpectedCharge, SubscriptionSnapshot } from './types';

export const HORIZON_MONTHS = 13;

export interface GenerationContext {
  today: IsoDate;
  globalMarginBp: number;
}

export function horizonEnd(today: IsoDate): IsoDate {
  return addMonthsAnchored(today, HORIZON_MONTHS, parts(today).day);
}

export function nthDueDate(subscription: SubscriptionSnapshot, n: number): IsoDate {
  const { nextChargeDate, periodUnit, periodCount, anchorDay } = subscription;
  if (periodUnit === 'week') {
    return addDays(nextChargeDate, 7 * periodCount * n);
  }
  const months = periodUnit === 'year' ? 12 * periodCount * n : periodCount * n;
  return addMonthsAnchored(nextChargeDate, months, anchorDay ?? parts(nextChargeDate).day);
}

function unfunded(subscriptionId: string, dueDate: IsoDate, amount: number, isTrialConversion: boolean): ExpectedCharge {
  return { subscriptionId, dueDate, expectedAmountCents: amount, fundedAmountCents: 0, status: 'unfunded', isTrialConversion };
}

export function generateCharges(subscription: SubscriptionSnapshot, context: GenerationContext): ExpectedCharge[] {
  if (subscription.archived || subscription.paymentMethod !== 'revolut' || subscription.status === 'cancelled') {
    return [];
  }

  if (subscription.status === 'trial') {
    if (!subscription.trialEndDate || subscription.postTrialAmountCents === null) {
      throw new Error(`essai incomplet : ${subscription.id}`);
    }
    return [unfunded(subscription.id, subscription.trialEndDate, subscription.postTrialAmountCents, true)];
  }

  const margin = effectiveMarginBp(subscription.marginOverrideBp, context.globalMarginBp);
  const end = horizonEnd(context.today);
  const charges: ExpectedCharge[] = [];

  for (let n = 0; ; n++) {
    const dueDate = nthDueDate(subscription, n);
    if (compareDates(dueDate, end) > 0) {
      break;
    }
    const afterPeriodEnd =
      subscription.status === 'to_cancel' &&
      subscription.periodEndDate !== null &&
      compareDates(dueDate, subscription.periodEndDate) > 0;

    charges.push(
      afterPeriodEnd
        ? unfunded(subscription.id, dueDate, subscription.amountCents, false)
        : {
            subscriptionId: subscription.id,
            dueDate,
            expectedAmountCents: subscription.amountCents,
            fundedAmountCents: fundedAmountCents(subscription.amountCents, margin),
            status: 'planned',
            isTrialConversion: false,
          },
    );
  }
  return charges;
}
