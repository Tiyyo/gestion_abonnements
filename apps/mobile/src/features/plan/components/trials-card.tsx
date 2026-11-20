import type { PlanTrial } from '@/db/repositories/plan/types';
import { hasTrialRisk, trialMessage } from '@/features/plan/plan-labels';
import { Card } from '@/ui/surfaces/card';
import { Body, Overline } from '@/ui/text/typography';

/** Risque d'essai oublié sur le mois : rien n'est affiché sans essai. */
export function TrialsCard({ trials }: { trials: PlanTrial[] }) {
  if (trials.length === 0) {
    return null;
  }
  const risky = hasTrialRisk(trials);
  return (
    <Card tone={risky ? 'warn' : 'ok'}>
      <Overline color={risky ? 'warnText' : 'okText'}>{risky ? 'Risque d’essai oublié' : 'Risque d’essai oublié : aucun'}</Overline>
      {trials.map((t) => (
        <Body key={t.name + t.dueDate} color={t.risk ? 'warnText' : 'okText'}>
          {trialMessage(t)}
        </Body>
      ))}
    </Card>
  );
}
