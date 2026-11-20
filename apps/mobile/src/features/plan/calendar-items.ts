import { makeDate } from '@abonnements/core';
import type { MonthPlan, PlanTransfer, PlanTrial } from '@/db/repositories/plan/types';
import { isInMonth } from './calendar-grid';

/** Ce qui se passe un jour donné, dans l'ordre d'affichage : virement de paie, transferts, prélèvements, fins d'essai. */
export type DayItem =
  | { kind: 'payday'; plan: MonthPlan }
  | { kind: 'transfer'; transfer: PlanTransfer }
  | { kind: 'charge'; name: string; amountCents: number; fundedOn: string; funded: boolean }
  | { kind: 'trial'; trial: PlanTrial };

export type DayItemsByDate = ReadonlyMap<string, DayItem[]>;

export type MarkerKind = 'trial' | 'transfer_todo' | 'payday' | 'transfer_done' | 'charge';

/** Du plus important au moins important : une case n'affiche que les trois premiers. */
export const MARKER_PRIORITY: readonly MarkerKind[] = ['trial', 'transfer_todo', 'payday', 'transfer_done', 'charge'];
export const MAX_MARKERS = 3;

const KIND_ORDER: Record<DayItem['kind'], number> = { payday: 0, transfer: 1, charge: 2, trial: 3 };

/**
 * Éléments du mois civil, par date. Un mois civil chevauche deux périodes de paie :
 * on passe les plans des périodes qui le recouvrent, les doublons sont écartés.
 */
export function monthDayItems(plans: readonly MonthPlan[], year: number, month: number): Map<string, DayItem[]> {
  const byDate = new Map<string, DayItem[]>();
  const seen = new Set<string>();
  const add = (date: string, key: string, item: DayItem) => {
    if (!isInMonth(date, year, month) || seen.has(key)) {
      return;
    }
    seen.add(key);
    byDate.set(date, [...(byDate.get(date) ?? []), item]);
  };
  for (const plan of plans) {
    add(plan.payday.date, `payday-${plan.payday.date}`, { kind: 'payday', plan });
    for (const transfer of plan.transfers) {
      add(transfer.effectiveDate, `transfer-${transfer.id}`, { kind: 'transfer', transfer });
      transfer.charges.forEach((charge, index) =>
        add(charge.dueDate, `charge-${transfer.id}-${transfer.chargeIds[index] ?? index}`, {
          kind: 'charge',
          name: charge.name,
          amountCents: charge.expectedAmountCents,
          fundedOn: transfer.effectiveDate,
          funded: transfer.done,
        }),
      );
    }
    for (const trial of plan.trials) {
      add(trial.dueDate, `trial-${trial.subscriptionId}-${trial.dueDate}`, { kind: 'trial', trial });
    }
  }
  for (const [date, items] of byDate) {
    // Tri stable (ES2019) : l'ordre d'arrivée est conservé à nature égale.
    byDate.set(
      date,
      [...items].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]),
    );
  }
  return byDate;
}

function markerOf(item: DayItem): MarkerKind {
  if (item.kind === 'transfer') {
    return item.transfer.done ? 'transfer_done' : 'transfer_todo';
  }
  return item.kind;
}

/** Repères d'une case : un par nature d'élément, par priorité, trois au plus. */
export function dayMarkers(items: readonly DayItem[]): MarkerKind[] {
  const present = new Set(items.map(markerOf));
  return MARKER_PRIORITY.filter((kind) => present.has(kind)).slice(0, MAX_MARKERS);
}

/** Jour choisi à l'ouverture d'un mois : aujourd'hui s'il est affiché, sinon le premier jour qui a un élément, sinon le 1er. */
export function defaultSelectedDay(year: number, month: number, today: string, items: DayItemsByDate): string {
  if (isInMonth(today, year, month)) {
    return today;
  }
  const first = [...items.keys()].sort()[0];
  return first ?? makeDate(year, month, 1);
}

/** Jour effectivement sélectionné : le choix de l'utilisateur s'il est dans le mois affiché, sinon le jour par défaut. */
export function resolveSelectedDay(picked: string | null, year: number, month: number, today: string, items: DayItemsByDate): string {
  return picked !== null && isInMonth(picked, year, month) ? picked : defaultSelectedDay(year, month, today, items);
}
