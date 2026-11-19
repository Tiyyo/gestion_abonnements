import { todayIn } from '@abonnements/core';
import { useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { type ExportFile, exportData, importData, parseExport } from '../db/backup';
import { useDb } from '../db/provider';
import { requestReschedule } from '../notifications/scheduler';

function writeJson(directory: typeof Paths.cache, name: string, data: ExportFile): File {
  const file = new File(directory, name);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(JSON.stringify(data, null, 2));
  return file;
}

export function useBackup() {
  const db = useDb();
  const queryClient = useQueryClient();

  return {
    async exportAndShare(): Promise<void> {
      const file = writeJson(Paths.cache, `abonnements-${todayIn()}.json`, await exportData(db));
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Exporter les abonnements' });
    },
    async pickImport(): Promise<ExportFile | null> {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
      const asset = result.canceled ? null : result.assets[0];
      return asset ? parseExport(await new File(asset.uri).text()) : null;
    },
    async replaceWith(file: ExportFile): Promise<string> {
      const safety = await exportData(db);
      const saved = writeJson(Paths.document, `sauvegarde-avant-import-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, safety);
      await importData(db, file, safety);
      queryClient.clear();
      requestReschedule(0);
      return saved.name;
    },
  };
}
