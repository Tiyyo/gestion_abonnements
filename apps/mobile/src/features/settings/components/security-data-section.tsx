import type { Settings } from '@/db/types';
import { useBackup } from '@/features/backup/hooks/use-backup';
import { useImportBackup } from '@/features/backup/hooks/use-import-backup';
import { authenticate } from '@/features/security/biometrics';
import { useBiometricAvailability } from '@/features/security/hooks/use-biometric-availability';
import type { SaveSetting } from '@/features/settings/types';
import { Toggle } from '@/ui/controls/toggle';
import { showError } from '@/ui/feedback/show-dialog';
import { Section } from '@/ui/surfaces/section';
import { SettingRow } from '@/ui/surfaces/setting-row';
import { SmallButton } from './small-button';

export function SecurityDataSection({ settings, save }: { settings: Settings; save: SaveSetting }) {
  const bioAvailable = useBiometricAvailability() === true;
  const backup = useBackup();
  const runImport = useImportBackup();

  const toggleBiometric = async (value: boolean) => {
    if (await authenticate(value ? 'Activer le verrouillage' : 'Désactiver le verrouillage')) {
      save({ biometric_lock: value ? 1 : 0 });
    }
  };

  return (
    <Section title="Sécurité et données">
      <SettingRow label="Verrouillage biométrique" hint={bioAvailable ? undefined : 'Aucune empreinte enregistrée sur le téléphone'}>
        <Toggle
          label="Verrouillage biométrique"
          value={settings.biometric_lock === 1 && bioAvailable}
          disabled={!bioAvailable}
          onChange={(checked) => toggleBiometric(checked)}
        />
      </SettingRow>
      <SettingRow label="Exporter (JSON)">
        <SmallButton
          label="Exporter"
          onPress={() => backup.exportAndShare().catch((e: Error) => showError('Export impossible', e.message))}
        />
      </SettingRow>
      <SettingRow label="Importer (remplace tout)" last>
        <SmallButton label="Importer" onPress={runImport} />
      </SettingRow>
    </Section>
  );
}
