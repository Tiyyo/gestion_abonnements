import { XStack } from 'tamagui';
import { readBalancesConfig } from '@/config/function-config';
import { daysUntil, freshness, vaultShortfallCents } from '@/features/balances/balances-derivations';
import { ConsentExpiredError } from '@/features/balances/consent-expired-error';
import { useBalances } from '@/features/balances/hooks/use-balances';
import { GlassCard } from '@/ui/surfaces/glass-card';
import { HeroAmount } from '@/ui/text/hero-amount';
import { Caption } from '@/ui/text/typography';
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
  const status = balances.isFetching ? 'Actualisation…' : data ? freshness(data.fetchedAt, now) : 'Actualiser';

  return (
    <GlassCard accessibilityLabel="Soldes Revolut">
      <XStack items="center" justify="space-between" gap="3">
        <Caption color="onGlassMuted">Dans le coffre Revolut</Caption>
        <RefreshChip status={status} onRefresh={() => balances.refetch()} />
      </XStack>

      <HeroAmount cents={data?.vault.amountCents ?? null} />

      <XStack gap="2">
        <Pocket label="Compte" cents={data?.current.amountCents ?? null} />
        <Pocket label="À transférer" cents={data ? pendingTransfersCents : null} />
      </XStack>

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
