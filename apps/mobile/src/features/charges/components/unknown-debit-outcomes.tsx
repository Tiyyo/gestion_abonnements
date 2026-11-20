import { CircleAlert, Link2, type LucideIcon, Plus } from 'lucide-react-native';
import { YStack } from 'tamagui';
import { Card } from '@/ui/surfaces/card';
import { Caption, Overline } from '@/ui/text/typography';
import { OutcomeRow } from './outcome-row';

// Les règles appliquées à l'enregistrement (db/reconcile/classify-debit), dans leur ordre.
const OUTCOMES: { icon: LucideIcon; title: string; detail: string }[] = [
  { icon: Link2, title: 'Un prélèvement prévu à 3 jours près', detail: 'Il est marqué comme passé.' },
  { icon: CircleAlert, title: 'Après une résiliation, ou en double', detail: 'Il est noté, pour réclamer au marchand.' },
  { icon: Plus, title: 'Un abonnement inconnu', detail: 'Sluis propose de le créer.' },
];

/** Ce que Sluis fera du débit : sans ça, l'écran ne dit pas pourquoi le saisir. */
export function UnknownDebitOutcomes() {
  return (
    <YStack gap="2">
      <Overline px="1" accessibilityRole="header">
        Ce que fait Sluis
      </Overline>
      <Card gap="3">
        {OUTCOMES.map((outcome) => (
          <OutcomeRow key={outcome.title} {...outcome} />
        ))}
        <Caption>Le montant compte dans le solde estimé du compte.</Caption>
      </Card>
    </YStack>
  );
}
