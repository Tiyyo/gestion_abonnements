import { XStack } from 'tamagui';
import { daysBeforeLabel } from '@/features/settings/labels';
import { REMINDER_DAY_OPTIONS, toggleReminderDay } from '@/features/settings/reminder-days';
import { Chip } from '@/ui/controls/chip';

export function ReminderChips({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  return (
    <XStack gap="2" flexWrap="wrap">
      {REMINDER_DAY_OPTIONS.map((day) => (
        <Chip
          key={day}
          label={`J-${day}`}
          accessibilityLabel={daysBeforeLabel(day)}
          selected={value.includes(day)}
          onPress={() => onChange(toggleReminderDay(value, day))}
        />
      ))}
    </XStack>
  );
}
