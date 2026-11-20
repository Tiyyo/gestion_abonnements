import { CircleAlert, Link2, type LucideIcon, Plus } from 'lucide-react-native';
import { XStack, YStack } from 'tamagui';
import { colors } from '@/theme/colors';
import { Card } from '@/ui/surfaces/card';
import { Body, Caption, Overline } from '@/ui/text/typography';

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
      <Overline px="1">Ce que fait Sluis</Overline>
      <Card gap="3">
        {OUTCOMES.map(({ icon: Icon, title, detail }) => (
          <XStack key={title} gap="3" items="flex-start">
            <YStack w={32} h={32} rounded="full" items="center" justify="center" bg="primarySoft">
              <Icon color={colors.primary} size={16} />
            </YStack>
            <YStack flex={1} gap="0.5">
              <Body>{title}</Body>
              <Caption>{detail}</Caption>
            </YStack>
          </XStack>
        ))}
        <Caption>Le montant compte dans le solde estimé du compte.</Caption>
      </Card>
    </YStack>
  );
}
