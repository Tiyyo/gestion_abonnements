import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { formatNotifTime, notifTimeToDate } from './notif-time';

/** Ouvre le sélecteur d'heure Android et rend l'heure choisie au format `HH:MM`. */
export function pickNotifTime(current: string, onPick: (time: string) => void): void {
  DateTimePickerAndroid.open({
    value: notifTimeToDate(current),
    mode: 'time',
    is24Hour: true,
    onChange: (event, date) => {
      if (event.type === 'set' && date) {
        onPick(formatNotifTime(date));
      }
    },
  });
}
