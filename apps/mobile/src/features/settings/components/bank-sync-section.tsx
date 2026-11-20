import type { SaveSetting } from '@/features/settings/types';
import { Toggle } from '@/ui/controls/toggle';
import { Section } from '@/ui/surfaces/section';
import { SettingRow } from '@/ui/surfaces/setting-row';

export function BankSyncSection({ included, on, save }: { included: boolean; on: boolean; save: SaveSetting }) {
  return (
    <Section title="Rapprochement">
      <SettingRow
        label="Rapprochement automatique"
        hint={
          included
            ? 'Sluis relit les débits du compte Revolut et marque passés les prélèvements reconnus sans équivoque. Le reste t’est demandé.'
            : 'Service non inclus dans cette version : le rapprochement reste manuel.'
        }
        last
      >
        <Toggle
          label="Rapprochement automatique"
          value={on}
          disabled={!included}
          onChange={(checked) => save({ auto_reconcile_enabled: checked ? 1 : 0 })}
        />
      </SettingRow>
    </Section>
  );
}
