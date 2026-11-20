import { addDays, todayIn } from '@abonnements/core';

export function trialEndFrom(trialDays: number | null, fallbackDays: number): string {
  return addDays(todayIn(), trialDays && trialDays > 0 ? trialDays : fallbackDays);
}
