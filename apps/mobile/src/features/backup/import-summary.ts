import type { ExportFile } from '@/db/backup';
import { formatDateFr } from '@/lib/format';

export const subscriptionCount = (n: number) => `${n} abonnement${n > 1 ? 's' : ''}`;

/** Texte de confirmation avant de remplacer toutes les données par celles du fichier. */
export function importConfirmMessage(file: Pick<ExportFile, 'exportedAt' | 'tables'>): string {
  return `Le fichier du ${formatDateFr(file.exportedAt.slice(0, 10))} contient ${subscriptionCount(file.tables.subscription.length)}. Toutes les données actuelles seront remplacées. Une sauvegarde de sécurité est faite avant.`;
}
