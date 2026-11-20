import type { ExportFile } from '@/db/backup';
import { dateOfTimestamp, dateShortYear } from '@/lib/dates';

export const subscriptionCount = (n: number) => `${n} abonnement${n > 1 ? 's' : ''}`;

/** Texte de confirmation avant de remplacer toutes les données par celles du fichier. */
export function importConfirmMessage(file: Pick<ExportFile, 'exportedAt' | 'tables'>): string {
  const exported = Number.isNaN(Date.parse(file.exportedAt)) ? '' : ` du ${dateShortYear(dateOfTimestamp(file.exportedAt))}`;
  return `Le fichier${exported} contient ${subscriptionCount(file.tables.subscription.length)}. Toutes les données actuelles seront remplacées. Une sauvegarde de sécurité est faite avant.`;
}
