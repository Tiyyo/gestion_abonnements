import {
  ceilDiv,
  effectiveMarginBp,
  formatEuros,
  fundedAmountCents,
  isProvisioned,
  periodMonths,
  type SubscriptionStatus,
} from '@abonnements/core';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, Plus } from 'lucide-react-native';
import { ScrollView, Spinner, XStack, YStack } from 'tamagui';
import type { SubscriptionRow } from '../../db/repositories/subscriptions';
import { useSettings } from '../../features/settings';
import { useSubscriptions } from '../../features/subscriptions';
import { formatDayMonth } from '../../ui/format';
import { Appear, haptic, Reveal, Settle } from '../../ui/motion';
import { ActionButton, Amount, Caption, Card, colors, EmptyState, IconButton, Label, Overline, ScreenHeader, TOP_GAP } from '../../ui/kit';
import { TAB_BAR_CLEARANCE } from '../../ui/TabBar';
import { SubscriptionAvatar } from '../../ui/SubscriptionAvatar';

const GROUPS: ReadonlyArray<{ status: Exclude<SubscriptionStatus, 'cancelled'>; title: string; dot: string }> = [
  { status: 'to_cancel', title: 'À résilier', dot: 'dangerText' },
  { status: 'trial', title: 'En essai', dot: 'warnText' },
  { status: 'active', title: 'Actifs', dot: 'okText' },
];

function per(row: SubscriptionRow): string {
  const { period_unit: unit, period_count: count } = row;
  const label = unit === 'week' ? 'sem.' : unit === 'month' ? 'mois' : 'an';
  return count === 1 ? `/ ${label}` : `/ ${count} ${unit === 'year' ? 'ans' : label}`;
}

function subtitle(row: SubscriptionRow, globalMarginBp: number): string {
  switch (row.status) {
    case 'trial':
      return `fin d’essai ${formatDayMonth(row.trial_end_date ?? row.next_charge_date)}`;
    case 'to_cancel':
      return `fin de période ${formatDayMonth(row.period_end_date ?? row.next_charge_date)}`;
    case 'cancelled':
      return 'résilié';
    case 'active': {
      const next = `prochain le ${formatDayMonth(row.next_charge_date)}`;
      if (!isProvisioned(row.period_unit, row.period_count)) {
        return next;
      }
      const funded = fundedAmountCents(row.amount_cents, effectiveMarginBp(row.margin_override_bp, globalMarginBp));
      const provision = ceilDiv(funded, periodMonths(row.period_unit, row.period_count));
      return `${next}, provisionné ${formatEuros(provision)}/mois`;
    }
  }
}

function SubscriptionLine({ row, globalMarginBp, last }: { row: SubscriptionRow; globalMarginBp: number; last: boolean }) {
  return (
    <XStack
      py="3"
      gap="3"
      items="center"
      minH={64}
      borderBottomWidth={last ? 0 : 1}
      borderColor="borderColor"
      onPress={() => router.push(`/subscriptions/${row.id}`)}
      opacity="1 press:0.6"
      transition="fast"
      accessibilityRole="button"
      accessibilityLabel={`${row.name}, ${formatEuros(row.amount_cents)} ${per(row)}`}
    >
      <SubscriptionAvatar name={row.name} iconKey={row.icon_key} />
      <YStack flex={1} gap="0.5">
        <Label fontSize={16} numberOfLines={1} color={row.status === 'cancelled' ? 'colorMuted' : 'color'}>
          {row.name}
        </Label>
        <Caption numberOfLines={2}>
          {row.category_name} · {subtitle(row, globalMarginBp)}
        </Caption>
      </YStack>
      <YStack items="flex-end">
        <Amount fontSize={16} color={row.status === 'cancelled' ? 'colorMuted' : 'color'}>
          {formatEuros(row.amount_cents)}
        </Amount>
        <Caption>{per(row)}</Caption>
      </YStack>
    </XStack>
  );
}

function GroupHeader({ title, count, dot }: { title: string; count: number; dot?: string }) {
  return (
    <XStack px="1" items="center" gap="2" accessibilityRole="header">
      {dot ? <YStack w={8} h={8} rounded={4} bg={dot as 'okText'} /> : null}
      <Overline>{title}</Overline>
      <Overline color="colorMuted" fontWeight="500">
        {String(count)}
      </Overline>
    </XStack>
  );
}

function byNextDate(a: SubscriptionRow, b: SubscriptionRow): number {
  return a.next_charge_date.localeCompare(b.next_charge_date) || a.name.localeCompare(b.name, 'fr');
}

export default function SubscriptionsScreen() {
  const insets = useSafeAreaInsets();
  const subscriptions = useSubscriptions();
  const settings = useSettings();
  const [showCancelled, setShowCancelled] = useState(false);

  const rows = useMemo(() => subscriptions.data ?? [], [subscriptions.data]);
  const groups = useMemo(
    () => GROUPS.map((g) => ({ ...g, rows: rows.filter((r) => r.status === g.status).sort(byNextDate) })).filter((g) => g.rows.length > 0),
    [rows],
  );
  const cancelled = useMemo(() => rows.filter((r) => r.status === 'cancelled').sort((a, b) => a.name.localeCompare(b.name, 'fr')), [rows]);
  const count = rows.length - cancelled.length;
  const globalMarginBp = settings.data?.global_margin_bp ?? 0;

  return (
    <YStack flex={1} bg="background" pt={insets.top + TOP_GAP.tab}>
      <ScreenHeader
        overline={`${count} abonnement${count > 1 ? 's' : ''} en cours`}
        title="Abonnements"
        trailing={
          <IconButton icon={Plus} label="Ajouter un abonnement" variant="primary" onPress={() => router.push('/subscriptions/new')} />
        }
      />

      {subscriptions.isPending ? (
        <Spinner mt="8" color="primary" />
      ) : rows.length === 0 ? (
        <EmptyState
          message="Aucun abonnement pour le moment."
          action={<ActionButton label="Ajouter un premier abonnement" onPress={() => router.push('/subscriptions/new')} />}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 20, gap: 24, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}>
          {groups.map((g, index) => (
            <Appear key={g.status} index={index}>
              <YStack gap="2">
                <GroupHeader title={g.title} count={g.rows.length} dot={g.dot} />
                <Card py="0" gap="0">
                  {g.rows.map((row, i) => (
                    <SubscriptionLine key={row.id} row={row} globalMarginBp={globalMarginBp} last={i === g.rows.length - 1} />
                  ))}
                </Card>
              </YStack>
            </Appear>
          ))}

          {cancelled.length > 0 ? (
            <Settle>
              <YStack gap="2">
                <XStack
                  px="1"
                  minH={44}
                  items="center"
                  justify="space-between"
                  onPress={() => {
                    haptic.select();
                    setShowCancelled((v) => !v);
                  }}
                  opacity="1 press:0.6"
                  transition="fast"
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showCancelled }}
                >
                  <GroupHeader title="Résiliés" count={cancelled.length} />
                  <XStack items="center" gap="1">
                    <Caption color="primary" fontWeight="600">
                      {showCancelled ? 'Masquer' : 'Afficher'}
                    </Caption>
                    <YStack rotate={showCancelled ? '180deg' : '0deg'} transition="smooth">
                      <ChevronDown color={colors.primary} size={18} />
                    </YStack>
                  </XStack>
                </XStack>
                {showCancelled ? (
                  <Reveal>
                    <Card py="0" gap="0">
                      {cancelled.map((row, i) => (
                        <SubscriptionLine key={row.id} row={row} globalMarginBp={globalMarginBp} last={i === cancelled.length - 1} />
                      ))}
                    </Card>
                  </Reveal>
                ) : null}
              </YStack>
            </Settle>
          ) : null}
        </ScrollView>
      )}
    </YStack>
  );
}
