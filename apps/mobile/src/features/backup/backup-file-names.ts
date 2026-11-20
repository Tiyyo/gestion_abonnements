/** Fichier partagé à l'export, daté du jour (`YYYY-MM-DD`). */
export function exportFileName(today: string): string {
  return `abonnements-${today}.json`;
}

/** Sauvegarde de sécurité écrite avant un import, horodatée sans caractères interdits dans un nom de fichier. */
export function safetyBackupFileName(now: Date): string {
  return `sauvegarde-avant-import-${now.toISOString().replace(/[:.]/g, '-')}.json`;
}
