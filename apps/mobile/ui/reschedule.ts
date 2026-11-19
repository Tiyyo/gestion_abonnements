import { compareDates } from '@abonnements/core';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import type { PlanTransfer } from '../db/repositories/plan';
import { toIsoDate } from './format';
import { showDialog } from './dialog';

export function pickRescheduleDate(transfer: PlanTransfer, today: string, onPick: (date: string | null) => void): void {
  const limit = transfer.charges.map((c) => c.dueDate).sort(compareDates)[0] ?? transfer.plannedDate;
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
      const apply = () => onPick(chosen === transfer.plannedDate ? null : chosen);
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
