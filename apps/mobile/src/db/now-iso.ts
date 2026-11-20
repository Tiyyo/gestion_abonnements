/** Horodatage ISO 8601 UTC à la seconde, format des colonnes `*_at`. */
export function nowIso(now: Date = new Date()): string {
  return now.toISOString().replace(/\.\d{3}Z$/, 'Z');
}
