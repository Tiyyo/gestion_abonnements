import { dayOfWeek, parts, todayIn } from '@abonnements/core';

/**
 * Vocabulaire unique des dates affichées. Tout part d'une date `YYYY-MM-DD` (fuseau Europe/Paris) lue par
 * `packages/core` en UTC : jamais de `new Date('YYYY-MM-DD')` ni de `toLocaleDateString`, dont le résultat
 * dépend du fuseau de l'appareil et des données ICU embarquées. Les espaces à l'intérieur d'une date sont
 * insécables, tout est en minuscules (`capitalize` en tête de ligne).
 */
const NBSP = '\u00a0';

const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MONTHS_LONG = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];
const WEEKDAYS_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const WEEKDAYS_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

function compose(date: string, months: string[], weekdays: string[] | null, today: string | undefined): string {
  const { year, month, day } = parts(date);
  const words = [day === 1 ? '1er' : String(day), months[month - 1] ?? ''];
  if (weekdays) {
    words.unshift(weekdays[dayOfWeek(date)] ?? '');
  }
  if (today !== undefined && parts(today).year !== year) {
    words.push(String(year));
  }
  return words.join(NBSP);
}

/** « 27 nov. » ; avec `today`, l'année s'ajoute quand elle diffère : « 5 janv. 2027 ». Listes, légendes, phrases. */
export function dateShort(date: string, today?: string): string {
  return compose(date, MONTHS_SHORT, null, today);
}

/** « 27 nov. 2026 », année toujours visible : dates durables (accord bancaire, fichier de sauvegarde). */
export function dateShortYear(date: string): string {
  return `${dateShort(date)}${NBSP}${parts(date).year}`;
}

/** « ven. 27 nov. » : transferts et échéances, là où le jour de la semaine aide à s'organiser. */
export function dateWithWeekday(date: string, today?: string): string {
  return compose(date, MONTHS_SHORT, WEEKDAYS_SHORT, today);
}

/** « vendredi 27 novembre » : surtitre du jour et libellés d'accessibilité. */
export function dateLong(date: string, today?: string): string {
  return compose(date, MONTHS_LONG, WEEKDAYS_LONG, today);
}

/** « Novembre 2026 » : titre d'un mois. */
export function monthYearTitle(year: number, month: number): string {
  return capitalize(`${MONTHS_LONG[month - 1] ?? ''}${NBSP}${year}`);
}

/** « nov », sans point : mois de la vignette calendrier, sous le numéro du jour. */
export function monthTile(date: string): string {
  return (MONTHS_SHORT[parts(date).month - 1] ?? '').replace('.', '');
}

/** Échéance relative à `days` jours : « aujourd’hui », « demain », « dans 3 jours », « hier », « il y a 3 jours ». */
export function relativeDay(days: number): string {
  if (days === 0) {
    return 'aujourd’hui';
  }
  if (Math.abs(days) === 1) {
    return days > 0 ? 'demain' : 'hier';
  }
  return days > 0 ? `dans ${days}${NBSP}jours` : `il y a ${-days}${NBSP}jours`;
}

/** Jour (Europe/Paris) d'un horodatage ISO 8601 UTC. */
export function dateOfTimestamp(timestamp: string): string {
  return todayIn(undefined, new Date(timestamp));
}

/** Majuscule initiale, pour une date en tête de ligne ou de titre. */
export function capitalize(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Termine une phrase par un point, sans doubler celui d'un mois abrégé : « … le 20 déc. », « … le 3 mars. ». */
export function endSentence(text: string): string {
  return text.endsWith('.') ? text : `${text}.`;
}
