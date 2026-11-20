import type { Settings } from '@/db/types';
import type { ExpandedRows, SaveSetting } from '@/features/settings/types';
import { Toggle } from '@/ui/controls/toggle';
import { Section } from '@/ui/surfaces/section';
import { SettingRow } from '@/ui/surfaces/setting-row';
import { ReminderRows } from './reminder-rows';

type RemindersSectionProps = {
  settings: Settings;
  rows: ExpandedRows;
  save: SaveSetting;
  notificationsAllowed: boolean | null;
  onAuthorize: () => void;
};

export function RemindersSection({ settings, rows, save, notificationsAllowed, onAuthorize }: RemindersSectionProps) {
  const remindersOn = settings.reminders_enabled === 1;
  return (
    <Section title="Rappels">
      <SettingRow
        label="Envoyer les rappels"
        hint={remindersOn ? 'Transferts à faire, fins d’essai et fins de période.' : 'Aucune notification ne sera envoyée.'}
        last={!remindersOn}
      >
        <Toggle label="Envoyer les rappels" value={remindersOn} onChange={(on) => save({ reminders_enabled: on ? 1 : 0 })} />
      </SettingRow>
      {remindersOn ? (
        <ReminderRows settings={settings} rows={rows} save={save} notificationsAllowed={notificationsAllowed} onAuthorize={onAuthorize} />
      ) : null}
    </Section>
  );
}
