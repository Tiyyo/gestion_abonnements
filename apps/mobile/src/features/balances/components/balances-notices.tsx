import { formatEuros } from '@abonnements/core';
import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react-native';
import type { Balances } from '@/features/balances/balances-schema';
import { RENEWAL_NOTICE_DAYS } from '@/features/balances/balances-derivations';
import { formatDayMonth } from '@/lib/format';
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

      {data && daysLeft !== null && daysLeft <= RENEWAL_NOTICE_DAYS ? (
        <Notice icon={TriangleAlert} color={colors.onGlassWarn} tone="onGlassWarn">
          {`Accord bancaire à renouveler avant le ${formatDayMonth(data.consentValidUntil.slice(0, 10))}.`}
        </Notice>
      ) : null}
    </>
  );
}
