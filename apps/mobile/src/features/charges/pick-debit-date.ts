import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { toIsoDate } from '@/lib/format';

/** Ouvre le sélecteur de date d'un débit déjà passé (au plus tard aujourd'hui). */
export function pickDebitDate(date: string, today: string, onPick: (date: string) => void): void {
  DateTimePickerAndroid.open({
    value: new Date(`${date}T12:00:00`),
    maximumDate: new Date(`${today}T12:00:00`),
    mode: 'date',
    onChange: (event, picked) => {
      if (event.type === 'set' && picked) {
        onPick(toIsoDate(picked));
      }
    },
  });
}
