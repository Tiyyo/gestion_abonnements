import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { toIsoDate } from '@/lib/format';

/** Ouvre le calendrier natif Android sur `initial` ; `minimum` interdit les jours antérieurs. */
export function openDatePicker(initial: string, minimum: string | undefined, onPick: (date: string) => void) {
  DateTimePickerAndroid.open({
    value: new Date(`${initial}T12:00:00`),
    mode: 'date',
    minimumDate: minimum ? new Date(`${minimum}T00:00:00`) : undefined,
    onChange: (event, date) => {
      if (event.type === 'set' && date) {
        onPick(toIsoDate(date));
      }
    },
  });
}
