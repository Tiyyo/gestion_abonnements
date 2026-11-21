import { KeyRound, Landmark, type LucideIcon, Undo2 } from 'lucide-react-native';
import { Spinner, XStack, YStack } from 'tamagui';
import type { ConsentPhase } from '@/features/consent/hooks/use-consent-flow';
import { useColors } from '@/theme/use-colors';
import { Card } from '@/ui/surfaces/card';
import { Body, Caption, Overline } from '@/ui/text/typography';

const STEPS: { icon: LucideIcon; title: string; detail: string }[] = [
  {
    icon: Landmark,
    title: 'Revolut s’ouvre dans le navigateur',
    detail: 'Connecte-toi et autorise la lecture des soldes et des mouvements, rien d’autre.',
  },
  { icon: Undo2, title: 'Retour automatique dans Sluis', detail: 'Si rien ne se passe, touche « Revenir dans Sluis ».' },
  { icon: KeyRound, title: 'Le nouvel accord reste sur ce téléphone', detail: 'Il n’est ni dans la sauvegarde JSON ni sur le serveur.' },
];

const PROGRESS: Partial<Record<ConsentPhase, string>> = {
  opening: 'Préparation de la demande…',
  waiting: 'En attente du retour de Revolut…',
  finishing: 'Récupération des comptes…',
  saving: 'Enregistrement…',
};

/** Ce qui va se passer, et où en est la demande. */
export function ConsentSteps({ phase, currentUntil }: { phase: ConsentPhase; currentUntil: string | null }) {
  const colors = useColors();
  const progress = PROGRESS[phase];
  return (
    <YStack gap="2">
      <Overline px="1">Renouveler l’accord Revolut</Overline>
      <Card gap="3">
        {STEPS.map(({ icon: Icon, title, detail }) => (
          <XStack key={title} gap="3" items="flex-start">
            <YStack w={32} h={32} rounded="full" items="center" justify="center" bg="primarySoft">
              <Icon color={colors.primaryText} size={16} />
            </YStack>
            <YStack flex={1} gap="0.5">
              <Body>{title}</Body>
              <Caption>{detail}</Caption>
            </YStack>
          </XStack>
        ))}
        <Caption>{currentUntil ? `Accord actuel valable jusqu’au ${currentUntil}.` : 'Aucun accord en cours connu de l’app.'}</Caption>
      </Card>
      {progress ? (
        <XStack gap="2" items="center" px="1" accessibilityLiveRegion="polite">
          <Spinner color="primaryText" />
          <Body color="colorMuted">{progress}</Body>
        </XStack>
      ) : null}
    </YStack>
  );
}
