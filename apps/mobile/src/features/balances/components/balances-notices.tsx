import { formatEuros } from '@abonnements/core';
import { router } from 'expo-router';
import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react-native';
import { XStack } from 'tamagui';
import { ActionButton } from '@/ui/controls/action-button';
import type { Balances } from '@/features/balances/balances-schema';
import { RENEWAL_NOTICE_DAYS } from '@/features/balances/balances-derivations';
import { dateOfTimestamp, dateShort, endSentence } from '@/lib/dates';
import { colors } from '@/theme/colors';
import { Notice } from './notice';

interface Props {
  data: Balances | undefined;
  expired: boolean;
  unavailable: boolean;
  pendingTransfersCents: number;
  shortfall: number;
  daysLeft: number | null;
}

/** Messages sous les soldes : accord expiré ou soldes indisponibles, couverture des transferts, renouvellement proche. */
export function BalancesNotices({ data, expired, unavailable, pendingTransfersCents, shortfall, daysLeft }: Props) {
  return (
    <>
      {expired ? (
        <Notice icon={CircleAlert} color={colors.onGlassDanger} tone="onGlassDanger">
          L’accord bancaire a expiré : il faut le renouveler pour revoir les soldes.
        </Notice>
      ) : unavailable && !data ? (
        <Notice icon={CircleAlert} color={colors.onGlassMuted} tone="onGlassMuted">
          Soldes indisponibles pour le moment.
        </Notice>
      ) : null}

      {data && pendingTransfersCents > 0 ? (
        shortfall > 0 ? (
          <Notice icon={TriangleAlert} color={colors.onGlassWarn} tone="onGlassWarn">
            {`Il manque ${formatEuros(shortfall)} au coffre pour les transferts à venir.`}
          </Notice>
        ) : (
          <Notice icon={CircleCheck} color={colors.onGlassOk} tone="onGlassOk">
            Le coffre couvre les transferts à venir.
          </Notice>
        )
      ) : null}

      {data && !expired && daysLeft !== null && daysLeft <= RENEWAL_NOTICE_DAYS ? (
        <Notice icon={TriangleAlert} color={colors.onGlassWarn} tone="onGlassWarn">
          {endSentence(`Accord bancaire à renouveler avant le ${dateShort(dateOfTimestamp(data.consentValidUntil))}`)}
        </Notice>
      ) : null}

      {expired || (data && daysLeft !== null && daysLeft <= RENEWAL_NOTICE_DAYS) ? (
        <XStack>
          <ActionButton size="sm" variant="onAccent" label="Renouveler l’accord" onPress={() => router.push('/consent')} />
        </XStack>
      ) : null}
    </>
  );
}
