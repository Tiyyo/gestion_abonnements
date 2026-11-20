import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import type { PlanTransfer } from '@/db/repositories/plan/types';
import { rescheduleLimit, rescheduleValue } from '@/features/plan/reschedule-limit';
import { toIsoDate } from '@/lib/format';
import { showDialog } from '@/ui/feedback/show-dialog';

/** Ouvre le sélecteur de date pour reporter un transfert ; prévient si la date choisie est le jour même du prélèvement. */
export function pickRescheduleDate(transfer: PlanTransfer, today: string, onPick: (date: string | null) => void): void {
  const limit = rescheduleLimit(transfer);
  DateTimePickerAndroid.open({
    value: new Date(`${transfer.effectiveDate}T12:00:00`),
    minimumDate: new Date(`${today}T00:00:00`),
    maximumDate: new Date(`${limit}T12:00:00`),
    mode: 'date',
    onChange: (event, date) => {
      if (event.type !== 'set' || !date) {
        return;
      }
      const chosen = toIsoDate(date);
      const apply = () => onPick(rescheduleValue(chosen, transfer.plannedDate));
      if (chosen === limit) {
        showDialog(
          'Le jour même du prélèvement',
          'Le prélèvement peut échouer si le marchand passe avant ton virement.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Reporter quand même', onPress: apply },
          ],
          { tone: 'warn' },
        );
      } else {
        apply();
      }
    },
  });
}
