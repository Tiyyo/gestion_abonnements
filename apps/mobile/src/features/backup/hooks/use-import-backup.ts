import { ImportError } from '@/db/backup';
import { importConfirmMessage } from '@/features/backup/import-summary';
import { showDialog, showError } from '@/ui/feedback/show-dialog';
import { useBackup } from './use-backup';

/** Import en remplacement seul : choix du fichier, confirmation, puis remplacement avec sauvegarde de sécurité. */
export function useImportBackup(): () => Promise<void> {
  const backup = useBackup();
  return async () => {
    try {
      const file = await backup.pickImport();
      if (!file) {
        return;
      }
      showDialog('Remplacer toutes les données ?', importConfirmMessage(file), [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Remplacer',
          style: 'destructive',
          onPress: () =>
            backup
              .replaceWith(file)
              .then((saved) => showDialog('Import terminé', `Sauvegarde de sécurité : ${saved}`, undefined, { tone: 'ok' }))
              .catch((error: Error) => showError('Import impossible', error.message)),
        },
      ]);
    } catch (error) {
      showError('Import impossible', error instanceof ImportError ? error.message : (error as Error).message);
    }
  };
}
