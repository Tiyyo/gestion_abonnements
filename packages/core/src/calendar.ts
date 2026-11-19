export type IsoDate = string;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

export class InvalidDateError extends Error {}

function toUtc(date: IsoDate): number {
  const match = ISO_DATE.exec(date);
  if (!match) {
    throw new InvalidDateError(`date invalide : ${date}`);
  }
  const [, y, m, d] = match;
  const utc = Date.UTC(Number(y), Number(m) - 1, Number(d));
  if (fromUtc(utc) !== date) {
    throw new InvalidDateError(`date inexistante : ${date}`);
  }
  return utc;
}

function fromUtc(utc: number): IsoDate {
  return new Date(utc).toISOString().slice(0, 10);
}

export function makeDate(year: number, month: number, day: number): IsoDate {
  return fromUtc(Date.UTC(year, month - 1, day));
}

export function parts(date: IsoDate): { year: number; month: number; day: number } {
  const d = new Date(toUtc(date));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtc(toUtc(date) + days * DAY_MS);
}

export function diffDays(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

export function compareDates(a: IsoDate, b: IsoDate): number {
  return toUtc(a) - toUtc(b);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function clampedMonthDate(year: number, month: number, anchorDay: number): IsoDate {
  return makeDate(year, month, Math.min(anchorDay, daysInMonth(year, month)));
}

export function addMonthsAnchored(date: IsoDate, months: number, anchorDay: number): IsoDate {
  const { year, month } = parts(date);
  const index = year * 12 + (month - 1) + months;
  return clampedMonthDate(Math.floor(index / 12), (index % 12) + 1, anchorDay);
}

export function dayOfWeek(date: IsoDate): number {
  return new Date(toUtc(date)).getUTCDay();
}

export function isWeekend(date: IsoDate): boolean {
  const dow = dayOfWeek(date);
  return dow === 0 || dow === 6;
}

export function easterSunday(year: number): IsoDate {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return makeDate(year, month, day);
}

const holidayCache = new Map<number, ReadonlySet<IsoDate>>();

export function frenchPublicHolidays(year: number): ReadonlySet<IsoDate> {
  const cached = holidayCache.get(year);
  if (cached) {
    return cached;
  }
  const easter = easterSunday(year);
  const holidays = new Set<IsoDate>([
    makeDate(year, 1, 1),
    addDays(easter, 1),
    makeDate(year, 5, 1),
    makeDate(year, 5, 8),
    addDays(easter, 39),
    addDays(easter, 50),
    makeDate(year, 7, 14),
    makeDate(year, 8, 15),
    makeDate(year, 11, 1),
    makeDate(year, 11, 11),
    makeDate(year, 12, 25),
  ]);
  holidayCache.set(year, holidays);
  return holidays;
}

export function isPublicHoliday(date: IsoDate): boolean {
  return frenchPublicHolidays(parts(date).year).has(date);
}

export function isBusinessDay(date: IsoDate): boolean {
  return !isWeekend(date) && !isPublicHoliday(date);
}

export function businessDayOnOrBefore(date: IsoDate): IsoDate {
  let current = date;
  while (!isBusinessDay(current)) {
    current = addDays(current, -1);
  }
  return current;
}

export function businessDayOnOrAfter(date: IsoDate): IsoDate {
  let current = date;
  while (!isBusinessDay(current)) {
    current = addDays(current, 1);
  }
  return current;
}

export const APP_TIME_ZONE = 'Europe/Paris';

export function todayIn(timeZone: string = APP_TIME_ZONE, now: Date = new Date()): IsoDate {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}
