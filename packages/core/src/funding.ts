import { addDays, businessDayOnOrAfter, businessDayOnOrBefore, clampedMonthDate, compareDates, type IsoDate } from './calendar';

export function transferDate(dueDate: IsoDate, fundingLeadDays: number): IsoDate {
  return businessDayOnOrBefore(addDays(dueDate, -fundingLeadDays));
}

export function effectiveTransferDate(transfer: { plannedDate: IsoDate; rescheduledDate: IsoDate | null }): IsoDate {
  return transfer.rescheduledDate ?? transfer.plannedDate;
}

export function paydayDate(year: number, month: number, paydayDay: number): IsoDate {
  return businessDayOnOrAfter(clampedMonthDate(year, month, paydayDay));
}

export interface FundableCharge {
  dueDate: IsoDate;
  fundedAmountCents: number;
  status: string;
}

export interface PlannedTransfer<C extends FundableCharge> {
  plannedDate: IsoDate;
  amountCents: number;
  charges: C[];
}

export function groupTransfers<C extends FundableCharge>(charges: readonly C[], fundingLeadDays: number): PlannedTransfer<C>[] {
  const byDate = new Map<IsoDate, C[]>();
  for (const charge of charges) {
    if (charge.status !== 'planned') {
      continue;
    }
    const date = transferDate(charge.dueDate, fundingLeadDays);
    byDate.set(date, [...(byDate.get(date) ?? []), charge]);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => compareDates(a, b))
    .map(([plannedDate, grouped]) => ({
      plannedDate,
      amountCents: grouped.reduce((sum, c) => sum + c.fundedAmountCents, 0),
      charges: grouped,
    }));
}
