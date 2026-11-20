import { formatEuros } from '@abonnements/core';
import type { HomeQuestion } from '@/db/repositories/home/types';
import type { QuestionAnswer } from '@/features/home/types';
import { formatDayMonth } from '@/lib/format';
import { ActionButton } from '@/ui/controls/action-button';
import { HomeCard } from './home-card';

interface Props {
  question: HomeQuestion;
  busy: boolean;
  onAnswer: (answer: QuestionAnswer) => void;
}

export function QuestionCard({ question, busy, onAnswer }: Props) {
  if (question.kind === 'trial_outcome') {
    return (
      <HomeCard
        tone="warn"
        caption={`Fin d’essai le ${formatDayMonth(question.date)}`}
        title={`${question.name} : prélèvement passé ?`}
        body={`Le prélèvement de ${formatEuros(question.amountCents)} n’était pas financé. Vérifie ton relevé Revolut.`}
        actions={
          <>
            <ActionButton flex={1} label="Il a échoué" variant="outline" disabled={busy} onPress={() => onAnswer('failed')} />
            <ActionButton flex={1} label="Il est passé" variant="warn" disabled={busy} onPress={() => onAnswer('paid')} />
          </>
        }
      />
    );
  }
  return (
    <HomeCard
      tone="warn"
      caption={`Fin de période le ${formatDayMonth(question.date)}`}
      title={`As-tu bien résilié ${question.name} ?`}
      body="Tant que ce n’est pas fait, ses prélèvements restent non financés."
      actions={
        <>
          {question.cancelUrl ? (
            <ActionButton flex={1} label="Ouvrir le lien" variant="outline" disabled={busy} onPress={() => onAnswer('open')} />
          ) : null}
          <ActionButton flex={1} label="Oui, résilié" variant="warn" disabled={busy} onPress={() => onAnswer('confirm')} />
        </>
      }
    />
  );
}
