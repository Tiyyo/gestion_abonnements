import type { Settings } from '@/db/types';
import { AndroidSetting, EXACT_ALARM_RELEVANT, openAndroidSetting } from '@/features/settings/android-settings';
import { pickNotifTime } from '@/features/settings/pick-notif-time';
import { parseDays, reminderLabel } from '@/features/settings/reminder-days';
import type { ExpandedRows, SaveSetting } from '@/features/settings/types';
import { SettingRow } from '@/ui/surfaces/setting-row';
import { Expandable } from './expandable';
import { ReminderChips } from './reminder-chips';
import { SmallButton } from './small-button';

type ReminderRowsProps = {
  settings: Settings;
  rows: ExpandedRows;
  save: SaveSetting;
  notificationsAllowed: boolean | null;
  onAuthorize: () => void;
};

/** Lignes affichées quand les rappels sont activés. */
export function ReminderRows({ settings: s, rows, save, notificationsAllowed, onAuthorize }: ReminderRowsProps) {
  const trialDays = parseDays(s.trial_reminder_days);
  const cancelDays = parseDays(s.cancel_reminder_days);
  return (
    <>
      {notificationsAllowed === false ? (
        <SettingRow label="Autorisation Android" hint="Les rappels ne peuvent pas s’afficher sans elle.">
          <SmallButton label="Autoriser" onPress={onAuthorize} />
        </SettingRow>
      ) : null}
      <SettingRow label="Heure des rappels">
        <SmallButton label={s.notif_time} onPress={() => pickNotifTime(s.notif_time, (time) => save({ notif_time: time }))} />
      </SettingRow>
      <Expandable
        open={rows.expanded === 'trial'}
        onToggle={() => rows.toggle('trial')}
        label="Fin d’essai"
        value={reminderLabel(trialDays)}
      >
        <ReminderChips value={trialDays} onChange={(days) => save({ trial_reminder_days: JSON.stringify(days) })} />
      </Expandable>
      <Expandable
        open={rows.expanded === 'cancel'}
        onToggle={() => rows.toggle('cancel')}
        label="Fin de période (à résilier)"
        value={reminderLabel(cancelDays)}
        last={!EXACT_ALARM_RELEVANT}
      >
        <ReminderChips value={cancelDays} onChange={(days) => save({ cancel_reminder_days: JSON.stringify(days) })} />
      </Expandable>
      {EXACT_ALARM_RELEVANT && (
        <SettingRow label="Alarmes exactes Android" last>
          <SmallButton label="Vérifier" onPress={() => openAndroidSetting(AndroidSetting.REQUEST_SCHEDULE_EXACT_ALARM, true)} />
        </SettingRow>
      )}
    </>
  );
}
