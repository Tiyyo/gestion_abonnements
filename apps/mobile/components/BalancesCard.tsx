import { formatEuros } from '@abonnements/core';
import { CircleAlert, CircleCheck, RotateCw, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import { XStack } from 'tamagui';
import { ConsentExpiredError, daysUntil, RENEWAL_NOTICE_DAYS, useBalances, vaultShortfallCents } from '../features/balances';
import { readBalancesConfig } from '../features/function-config';
import { GlassCard, GlassPanel } from '../ui/Glass';
import { Amount, Caption, colors, HeroAmount } from '../ui/kit';
import { formatDayMonth } from '../ui/format';
import { haptic } from '../ui/motion';

function freshness(fetchedAt: string, now: Date): string {
  const at = new Date(fetchedAt);
  if (now.getTime() - at.getTime() < 60_000) {
    return 'à l’instant';
  }
  const time = at.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return at.toDateString() === now.toDateString() ? `à ${time}` : `le ${formatDayMonth(fetchedAt.slice(0, 10))} à ${time}`;
}

function Notice({ icon: Icon, color, tone, children }: { icon: LucideIcon; color: string; tone: string; children: string }) {
  return (
    <XStack gap="2" items="center" accessibilityLiveRegion="polite">
      <Icon color={color} size={16} />
      <Caption flex={1} color={tone as 'okText'}>
        {children}
      </Caption>
    </XStack>
  );
}

function Pocket({ label, cents }: { label: string; cents: number | null }) {
  return (
    <GlassPanel>
      <Caption color="onGlassMuted">{label}</Caption>
      <Amount fontSize={17} fontWeight="700" color="onGlass">
        {cents === null ? '—' : formatEuros(cents)}
      </Amount>
    </GlassPanel>
  );
}

export function BalancesCard({ pendingTransfersCents }: { pendingTransfersCents: number }) {
  const balances = useBalances();
  if (!readBalancesConfig()) {
    return null;
  }

  const now = new Date();
  const data = balances.data;
  const expired = balances.error instanceof ConsentExpiredError;
  const status = balances.isFetching ? 'Actualisation…' : data ? freshness(data.fetchedAt, now) : 'Actualiser';
  const shortfall = data ? vaultShortfallCents(data.vault.amountCents, pendingTransfersCents) : 0;
  const daysLeft = data ? daysUntil(data.consentValidUntil, now) : null;

  return (
    <GlassCard accessibilityLabel="Soldes Revolut">
      <XStack items="center" justify="space-between" gap="3">
        <Caption color="onGlassMuted">Dans le coffre Revolut</Caption>
        <XStack
          minH={44}
          items="center"
          onPress={() => {
            haptic.select();
            balances.refetch();
          }}
          opacity="1 press:0.6"
          transition="fast"
          accessibilityRole="button"
          accessibilityLabel={`Mis à jour ${status}. Actualiser les soldes`}
        >
          <XStack items="center" gap="1.5" px="2.5" py="1" rounded={99} bg="glassFill" borderWidth={1} borderColor="glassEdge">
            <RotateCw color={colors.onGlassMuted} size={12} />
            <Caption fontSize={12} color="onGlass">
              {status}
            </Caption>
          </XStack>
        </XStack>
      </XStack>

      <HeroAmount cents={data?.vault.amountCents ?? null} />

      <XStack gap="2">
        <Pocket label="Compte" cents={data?.current.amountCents ?? null} />
        <Pocket label="À transférer" cents={data ? pendingTransfersCents : null} />
      </XStack>

      {expired ? (
        <Notice icon={CircleAlert} color={colors.onGlassDanger} tone="onGlassDanger">
          L’accord bancaire a expiré : il faut le renouveler pour revoir les soldes.
        </Notice>
      ) : balances.isError && !data ? (
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
    </GlassCard>
  );
}

export function VaultCoverage({ remainingCents }: { remainingCents: number }) {
  const balances = useBalances();
  const data = balances.data;
  if (!data || remainingCents <= 0) {
    return null;
  }
  const shortfall = vaultShortfallCents(data.vault.amountCents, remainingCents);
  return shortfall > 0 ? (
    <Notice icon={TriangleAlert} color={colors.warn} tone="warnText">
      {`Coffre ${formatEuros(data.vault.amountCents)} : il manque ${formatEuros(shortfall)} pour les ${formatEuros(remainingCents)} restant à transférer.`}
    </Notice>
  ) : (
    <Notice icon={CircleCheck} color={colors.ok} tone="okText">
      {`Coffre ${formatEuros(data.vault.amountCents)} : couvre les ${formatEuros(remainingCents)} restant à transférer.`}
    </Notice>
  );
}
