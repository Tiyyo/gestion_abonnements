import type { PlanTrial } from '@/db/repositories/plan/types';
import { trialBody, trialEndLabel } from '@/features/home/home-wording';
import { dateShort } from '@/lib/dates';
import { ActionButton } from '@/ui/controls/action-button';
import { HomeCard } from './home-card';

interface Props {
  trial: PlanTrial;
  today: string;
  busy: boolean;
  onKeep: () => void;
  onCancel: () => void;
}

export function TrialCard({ trial, today, busy, onKeep, onCancel }: Props) {
  return (
    <HomeCard
      tone="warn"
      caption={`Essai · ${trialEndLabel(trial.dueDate, today)}`}
      title={`${trial.name} · ${dateShort(trial.dueDate)}`}
      body={trialBody(trial)}
      actions={
        <>
          <ActionButton
            flex={1}
            label="Garder"
            accessibilityLabel={`Garder ${trial.name}`}
            variant="outline"
            disabled={busy}
            onPress={onKeep}
          />
          <ActionButton
            flex={1}
            label="Résilier"
            accessibilityLabel={`Résilier ${trial.name}`}
            variant="warn"
            disabled={busy}
            onPress={onCancel}
          />
        </>
      }
    />
  );
}
