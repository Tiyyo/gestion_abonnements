import { formatEuros } from '@abonnements/core';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, ScrollView, Spinner, XStack, YStack } from 'tamagui';
import type { CategoryCost } from '../db/repositories/stats';
import { useStats } from '../features/stats';
import { Amount, Body, Card, CardTitle, Display, KeyValue, Label, Overline, StackHeader, TOP_GAP } from '../ui/kit';

function Bars({ rows, total }: { rows: CategoryCost[]; total: number }) {
  return (
    <YStack gap="3">
      {rows.map((r) => {
        const pct = total > 0 ? Math.round((r.cents / total) * 100) : 0;
        return (
          <YStack key={r.category} gap="1" accessible accessibilityLabel={`${r.category} : ${formatEuros(r.cents)}, ${pct} %`}>
            <XStack justify="space-between" gap="3">
              <Label shrink={1}>{r.category}</Label>
              <Amount fontWeight="400">{`${formatEuros(r.cents)} · ${pct}\u202f%`}</Amount>
            </XStack>
            <YStack h={8} rounded="full" bg="subtle">
              <YStack h={8} rounded="full" bg="primary" w={`${Math.max(pct, 2)}%`} />
            </YStack>
          </YStack>
        );
      })}
    </YStack>
  );
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const stats = useStats();
  const [tab, setTab] = useState<'month' | 'year'>('month');
  const s = stats.data;

  return (
    <YStack flex={1} bg="background" pt={insets.top + TOP_GAP.stack}>
      <StackHeader title="Statistiques" />

      <XStack mx="4" mt="2" p="1" bg="subtle" rounded="lg" gap="1">
        {(['month', 'year'] as const).map((key) => (
          <Button
            key={key}
            flex={1}
            minH={44}
            rounded="md"
            bg={tab === key ? 'surface' : 'transparent'}
            onPress={() => setTab(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === key }}
          >
            <Button.Text fontSize={15} fontWeight="600" color={tab === key ? 'color' : 'colorMuted'}>
              {key === 'month' ? 'Mensuel' : 'Annuel'}
            </Button.Text>
          </Button>
        ))}
      </XStack>

      {!s ? (
        <Spinner mt="8" color="primary" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}>
          <Card tone="accent" gap="1">
            <Overline color="onPrimary" opacity={0.85}>
              {tab === 'month' ? 'Coût mensuel des abonnements actifs' : 'Coût annuel des abonnements actifs'}
            </Overline>
            <Display color="onPrimary">{formatEuros(tab === 'month' ? s.monthlyCents : s.annualCents)}</Display>
            <Body color="onPrimary">
              {tab === 'month' ? `soit ${formatEuros(s.annualCents)} par an` : `soit ${formatEuros(s.monthlyCents)} par mois`}
            </Body>
          </Card>

          <Card gap="3">
            <CardTitle>Répartition par catégorie</CardTitle>
            {(tab === 'month' ? s.monthlyByCategory : s.annualByCategory).length === 0 ? (
              <Body color="colorMuted">Aucun abonnement actif.</Body>
            ) : (
              <Bars
                rows={tab === 'month' ? s.monthlyByCategory : s.annualByCategory}
                total={tab === 'month' ? s.monthlyCents : s.annualCents}
              />
            )}
          </Card>

          <Card py="0" gap="0">
            {tab === 'month' ? (
              <>
                <KeyValue label="Abonnements mensuels" value={formatEuros(s.monthlySubscriptionsCents)} />
                <KeyValue label="Annuels et longs, ramenés au mois" value={formatEuros(s.longSubscriptionsPerMonthCents)} />
              </>
            ) : (
              <KeyValue label="Dépensé sur 12 mois" value={formatEuros(s.spentLast12MonthsCents)} />
            )}
            <KeyValue
              label="Exclus : essais et « à résilier »"
              value={`${s.excludedCount} abonnement${s.excludedCount > 1 ? 's' : ''}`}
              last
            />
          </Card>
        </ScrollView>
      )}
    </YStack>
  );
}
