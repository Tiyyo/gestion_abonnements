import { addDays, compareDates, dayOfWeek, formatEuros, parts } from '@abonnements/core';

/** Transfert coffre → compte encore à faire, réduit à ce que le widget a le droit d'afficher. */
export interface WidgetTransfer {
  date: string;
  amountCents: number;
  names: string[];
}

export type WidgetState = 'next' | 'overdue' | 'empty';

/** Ce que le widget affiche à partir du jour `from` (inclus), tant qu'aucune image plus récente ne s'applique. */
export interface WidgetFrame {
  from: string;
  state: WidgetState;
  caption: string;
  headline: string;
  detail: string;
  label: string;
}

/**
 * Instantané écrit par l'app et lu par le widget natif, qui n'a ni base ni JavaScript.
 * Les images couvrent les jours à venir (demain, aujourd'hui, en retard) : le widget reste juste sans rouvrir l'app.
 */
export interface WidgetSnapshot {
  version: 1;
  frames: WidgetFrame[];
}

export const WIDGET_MAX_TRANSFERS = 24;
const MAX_NAMES = 3;
const WEEKDAYS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
const MONTHS = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];

function dayMonth(date: string): string {
  const { day, month } = parts(date);
  return `${day} ${MONTHS[month - 1]}`;
}

function whenCaption(date: string, day: string): string {
  if (date === day) {
    return `Aujourd’hui · ${dayMonth(date)}`;
  }
  if (date === addDays(day, 1)) {
    return `Demain · ${dayMonth(date)}`;
  }
  return `${WEEKDAYS[dayOfWeek(date)]} ${dayMonth(date)}`;
}

/** « Netflix, Spotify et 2 autres » : noms sans doublon, dans l'ordre des transferts. */
export function namesLabel(names: readonly string[]): string {
  const unique = [...new Set(names)];
  if (unique.length <= MAX_NAMES) {
    return unique.join(', ');
  }
  const rest = unique.length - (MAX_NAMES - 1);
  return `${unique.slice(0, MAX_NAMES - 1).join(', ')} et ${rest} autres`;
}

function detailFor(names: readonly string[]): string {
  return names.length > 0 ? `Pour ${namesLabel(names)}` : 'Coffre → compte';
}

function overdueFrame(from: string, overdue: readonly WidgetTransfer[]): WidgetFrame {
  const amount = formatEuros(overdue.reduce((sum, t) => sum + t.amountCents, 0));
  const detail = detailFor(overdue.flatMap((t) => t.names));
  const single = overdue.length === 1;
  return {
    from,
    state: 'overdue',
    caption: single ? `En retard · ${dayMonth(overdue[0].date)}` : `${overdue.length} en retard`,
    headline: amount,
    detail,
    label: single
      ? `Transfert en retard depuis le ${dayMonth(overdue[0].date)} : ${amount} du coffre vers le compte. ${detail}.`
      : `${overdue.length} transferts en retard : ${amount} du coffre vers le compte. ${detail}.`,
  };
}

function nextFrame(from: string, next: WidgetTransfer): WidgetFrame {
  const amount = formatEuros(next.amountCents);
  const caption = whenCaption(next.date, from);
  const detail = detailFor(next.names);
  return {
    from,
    state: 'next',
    caption,
    headline: amount,
    detail,
    label: `Prochain transfert, ${caption.replace(' · ', ' ').toLowerCase()} : ${amount} du coffre vers le compte. ${detail}.`,
  };
}

function frameAt(day: string, transfers: readonly WidgetTransfer[]): WidgetFrame {
  const overdue = transfers.filter((t) => compareDates(t.date, day) < 0);
  if (overdue.length > 0) {
    return overdueFrame(day, overdue);
  }
  const next = transfers[0];
  return next
    ? nextFrame(day, next)
    : {
        from: day,
        state: 'empty',
        caption: '',
        headline: 'Rien à transférer',
        detail: 'Aucun transfert prévu',
        label: 'Rien à transférer.',
      };
}

function sameDisplay(a: WidgetFrame, b: WidgetFrame): boolean {
  return a.state === b.state && a.caption === b.caption && a.headline === b.headline && a.detail === b.detail;
}

/**
 * Construit l'instantané du widget à partir des transferts coffre → compte encore prévus.
 * L'affichage ne change qu'à trois moments par transfert (la veille, le jour même, le lendemain s'il n'est pas fait) :
 * une image est calculée pour chacun de ces jours, en supposant que rien n'est marqué fait d'ici là.
 */
export function buildWidgetSnapshot(planned: readonly WidgetTransfer[], today: string): WidgetSnapshot {
  const transfers = [...planned].sort((a, b) => compareDates(a.date, b.date)).slice(0, WIDGET_MAX_TRANSFERS);
  const days = new Set<string>([today]);
  for (const t of transfers) {
    for (const day of [addDays(t.date, -1), t.date, addDays(t.date, 1)]) {
      if (compareDates(day, today) > 0) {
        days.add(day);
      }
    }
  }
  const frames: WidgetFrame[] = [];
  for (const day of [...days].sort(compareDates)) {
    const frame = frameAt(day, transfers);
    const previous = frames[frames.length - 1];
    if (!previous || !sameDisplay(previous, frame)) {
      frames.push(frame);
    }
  }
  return { version: 1, frames };
}

/** Image applicable un jour donné : la dernière dont le jour de départ est atteint (même règle que le code natif). */
export function frameFor(snapshot: WidgetSnapshot, day: string): WidgetFrame | null {
  let current: WidgetFrame | null = null;
  for (const frame of snapshot.frames) {
    if (compareDates(frame.from, day) <= 0) {
      current = frame;
    }
  }
  return current;
}
