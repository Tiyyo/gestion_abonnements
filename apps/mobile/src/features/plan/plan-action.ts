import type { PaydayPeriod } from '@abonnements/core';

export type PlanAction =
  | { type: 'transfer_done'; transferId: string }
  | { type: 'transfer_undo'; transferId: string }
  | { type: 'reschedule'; transferId: string; date: string | null }
  | { type: 'payday_done'; period: PaydayPeriod }
  | { type: 'payday_undo'; transferId: string }
  | { type: 'residual'; amountCents: number };
