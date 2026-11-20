import { todayIn } from '@abonnements/core';
import { useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { type ExportFile, exportData, importData, parseExport } from '@/db/backup';
import { useDb } from '@/db/provider';
import { exportFileName, safetyBackupFileName } from '@/features/backup/backup-file-names';
import { writeJsonFile } from '@/features/backup/write-json-file';
import { requestReschedule } from '@/notifications/scheduler';

export function useBackup() {
  const db = useDb();
  const queryClient = useQueryClient();

  return {
    async exportAndShare(): Promise<void> {
      const file = writeJsonFile(Paths.cache, exportFileName(todayIn()), await exportData(db));
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Exporter les abonnements' });
    },
    async pickImport(): Promise<ExportFile | null> {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
      const asset = result.canceled ? null : result.assets[0];
      return asset ? parseExport(await new File(asset.uri).text()) : null;
    },
    async replaceWith(file: ExportFile): Promise<string> {
      const safety = await exportData(db);
      const saved = writeJsonFile(Paths.document, safetyBackupFileName(new Date()), safety);
      await importData(db, file, safety);
      queryClient.clear();
      requestReschedule(0);
      return saved.name;
    },
  };
}
