import type { HomeData } from '@/db/repositories/home/types';
import type { HomeActions } from '@/features/home/hooks/use-home-actions';
import { Appear } from '@/ui/motion/appear';
import { NextTransferCard } from './next-transfer-card';
import { OverdueTransferCard } from './overdue-transfer-card';
import { QuestionCard } from './question-card';
import { ReviewList } from './review-list';
import { TrialCard } from './trial-card';
import { UnexpectedDebitCard } from './unexpected-debit-card';
import { UpcomingChargesList } from './upcoming-charges-list';

/** Contenu de l'Accueil quand il y a des abonnements : transferts, questions, débits non prévus, essais, vérifications et prochains prélèvements. */
export function HomeFeed({ data, today, actions }: { data: HomeData; today: string; actions: HomeActions }) {
  const { busy } = actions;
  const next = data.next;
  return (
    <>
      {data.overdue.map((t, index) => (
        <Appear key={t.id} index={index}>
          <OverdueTransferCard transfer={t} busy={busy} onDone={() => actions.markTransferDone(t.id)} />
        </Appear>
      ))}

      {next && (
        <Appear key={next.id} index={data.overdue.length}>
          <NextTransferCard
            transfer={next}
            today={today}
            busy={busy}
            onDone={() => actions.markTransferDone(next.id)}
            onReschedule={() => actions.reschedule(next)}
            onRevolut={() => actions.openRevolut(next)}
          />
        </Appear>
      )}

      {data.questions.map((q, index) => (
        <Appear key={`${q.kind}-${q.subscriptionId}`} index={index + 1}>
          <QuestionCard question={q} busy={busy} onAnswer={(kind) => actions.answer(q, kind)} />
        </Appear>
      ))}

      {data.unexpectedDebits.map((debit, index) => (
        <Appear key={debit.transactionId} index={index + 1}>
          <UnexpectedDebitCard
            debit={debit}
            busy={busy}
            onReview={() => actions.reviewDebit(debit)}
            onDismiss={() => actions.dismissDebit(debit)}
          />
        </Appear>
      ))}

      {data.trials.map((trial, index) => (
        <Appear key={trial.subscriptionId} index={index + 1}>
          <TrialCard
            trial={trial}
            today={today}
            busy={busy}
            onKeep={() => actions.keepTrial(trial)}
            onCancel={() => actions.cancelTrial(trial)}
          />
        </Appear>
      ))}

      <ReviewList reviews={data.toReview} />
      <UpcomingChargesList upcoming={data.upcoming} />
    </>
  );
}
