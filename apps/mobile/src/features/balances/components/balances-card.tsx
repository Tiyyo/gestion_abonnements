import { XStack, YStack } from 'tamagui';
import { readBalancesConfig } from '@/config/function-config';
import { daysUntil, freshness, refreshAccessibilityLabel, vaultShortfallCents } from '@/features/balances/balances-derivations';
import { ConsentExpiredError } from '@/features/balances/consent-expired-error';
import { useBalances } from '@/features/balances/hooks/use-balances';
import { BUSY_A11Y } from '@/ui/feedback/busy-a11y';
import { SkeletonLine } from '@/ui/feedback/skeleton-line';
import { GlassCard } from '@/ui/surfaces/glass-card';
import { HeroAmount } from '@/ui/text/hero-amount';
import { Caption, Display } from '@/ui/text/typography';
import { BalancesNotices } from './balances-notices';
import { Pocket } from './pocket';
import { RefreshChip } from './refresh-chip';

export function BalancesCard({ pendingTransfersCents }: { pendingTransfersCents: number }) {
  const balances = useBalances();
  if (!readBalancesConfig()) {
    return null;
  }

  const now = new Date();
  const data = balances.data;
  // Premier chargement (ou nouvel essai sans aucune valeur) : blocs fantômes. Une actualisation garde les valeurs précédentes.
  const loading = !data && balances.isFetching;
  const fresh = data ? freshness(data.fetchedAt, now) : null;
  const status = balances.isFetching ? 'Actualisation…' : (fresh ?? 'Actualiser');

  return (
    <GlassCard>
      <XStack items="center" justify="space-between" gap="3">
        <Caption color="onGlassMuted">Dans le coffre Revolut</Caption>
        <RefreshChip
          status={status}
          busy={balances.isFetching}
          accessibilityLabel={refreshAccessibilityLabel(balances.isFetching, fresh)}
          onRefresh={() => balances.refetch()}
        />
      </XStack>

      <YStack gap="3" {...(loading ? BUSY_A11Y : null)}>
        {loading ? (
          <SkeletonLine tone="glass" w={168} radius={10}>
            <Display>0</Display>
          </SkeletonLine>
        ) : (
          <HeroAmount cents={data?.vault.amountCents ?? null} />
        )}

        <XStack gap="2">
          <Pocket label="Compte" cents={data?.current.amountCents ?? null} loading={loading} />
          <Pocket label="À transférer" cents={data ? pendingTransfersCents : null} loading={loading} />
        </XStack>
      </YStack>

      <BalancesNotices
        data={data}
        expired={balances.error instanceof ConsentExpiredError}
        unavailable={balances.isError}
        pendingTransfersCents={pendingTransfersCents}
        shortfall={data ? vaultShortfallCents(data.vault.amountCents, pendingTransfersCents) : 0}
        daysLeft={data ? daysUntil(data.consentValidUntil, now) : null}
      />
    </GlassCard>
  );
}
