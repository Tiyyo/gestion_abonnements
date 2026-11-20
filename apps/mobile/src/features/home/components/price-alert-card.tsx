import { TrendingUp, X } from 'lucide-react-native';
import { XStack } from 'tamagui';
import type { HomePriceAlert } from '@/db/repositories/home/types';
import { priceAlertBody, priceAlertTitle } from '@/features/home/home-wording';
import { useColors } from '@/theme/use-colors';
import { ActionButton } from '@/ui/controls/action-button';
import { IconButton } from '@/ui/controls/icon-button';
import { Card } from '@/ui/surfaces/card';
import { Body, CardTitle, Overline } from '@/ui/text/typography';

interface Props {
  alert: HomePriceAlert;
  busy: boolean;
  onOpen: () => void;
  onStop: () => void;
  onDismiss: () => void;
}

/** Hausse de prix récente : voir la fiche, résilier, ou masquer l'alerte. */
export function PriceAlertCard({ alert, busy, onOpen, onStop, onDismiss }: Props) {
  const colors = useColors();
  return (
    <Card tone="warn">
      <XStack gap="2" items="center" mt={-8} mr={-8}>
        <TrendingUp color={colors.warn} size={18} strokeWidth={2.25} />
        <Overline flex={1} color="warnText">
          Hausse de prix
        </Overline>
        <IconButton icon={X} label={`Masquer l’alerte de hausse de prix de ${alert.name}`} variant="ghost" onPress={onDismiss} />
      </XStack>
      <CardTitle>{priceAlertTitle(alert)}</CardTitle>
      <Body>{priceAlertBody(alert)}</Body>
      <XStack gap="3" mt="2">
        <ActionButton flex={1} size="sm" label="Voir l’abonnement" variant="outline" disabled={busy} onPress={onOpen} />
        <ActionButton size="sm" label="Résilier" variant="danger" disabled={busy} onPress={onStop} />
      </XStack>
    </Card>
  );
}
