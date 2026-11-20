import { formatEuros } from '@abonnements/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, Spinner, XStack, YStack } from 'tamagui';
import type { CategoryCost } from '../db/repositories/stats';
import { useStats } from '../features/stats';
import { GlassCard, GlassPanel } from '../ui/Glass';
import { Hero, HeroStatusBar, useHeroStatusBar } from '../ui/Hero';
import { ActionButton, Amount, Body, Caption, Card, CardTitle, HeroAmount, KeyValue, Label, StackHeader, TOP_GAP } from '../ui/kit';
import { Segmented } from '../ui/Segmented';

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

const HERO_OVERLAP = 56;
const subscriptionCount = (n: number) => `${n} abonnement${n > 1 ? 's' : ''}`;

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const heroBar = useHeroStatusBar();
  const stats = useStats();
  const [tab, setTab] = useState<'month' | 'year'>('month');
  const s = stats.data;
  const rows = s ? (tab === 'month' ? s.monthlyByCategory : s.annualByCategory) : [];

  return (
    <YStack flex={1} bg="background">
      <HeroStatusBar past={heroBar.past} />
      <ScrollView onScroll={heroBar.onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <Hero pt={insets.top + TOP_GAP.stack} pb={HERO_OVERLAP + 20} gap="4">
          <StackHeader onHero title="Statistiques" />
          <YStack px="4" gap="3">
            <Segmented
              onGlass
              label="Période"
              value={tab}
              onChange={setTab}
              options={[
                { key: 'month', label: 'Mensuel' },
                { key: 'year', label: 'Annuel' },
              ]}
            />
            <GlassCard>
              <Caption color="onGlassMuted">
                {tab === 'month' ? 'Coût mensuel des abonnements actifs' : 'Coût annuel des abonnements actifs'}
              </Caption>
              <HeroAmount cents={s ? (tab === 'month' ? s.monthlyCents : s.annualCents) : null} />
              <XStack gap="2">
                <GlassPanel>
                  <Caption color="onGlassMuted">{tab === 'month' ? 'Par an' : 'Par mois'}</Caption>
                  <Amount fontSize={17} fontWeight="700" color="onGlass">
                    {s ? formatEuros(tab === 'month' ? s.annualCents : s.monthlyCents) : '—'}
                  </Amount>
                </GlassPanel>
                <GlassPanel>
                  <Caption color="onGlassMuted">Exclus du total</Caption>
                  <Amount fontSize={17} fontWeight="700" color="onGlass">
                    {s ? subscriptionCount(s.excludedCount) : '—'}
                  </Amount>
                </GlassPanel>
              </XStack>
            </GlassCard>
          </YStack>
        </Hero>

        <YStack px="4" gap="3" mt={-HERO_OVERLAP}>
          {!s ? (
            <Spinner mt="8" color="primary" />
          ) : (
            <>
              <Card lift gap="3">
                <CardTitle>Répartition par catégorie</CardTitle>
                {rows.length === 0 ? (
                  <YStack gap="3" items="flex-start">
                    <Body color="colorMuted">Les abonnements actifs apparaîtront ici, regroupés par catégorie.</Body>
                    <ActionButton label="Ajouter un abonnement" variant="outline" onPress={() => router.push('/subscriptions/new')} />
                  </YStack>
                ) : (
                  <Bars rows={rows} total={tab === 'month' ? s.monthlyCents : s.annualCents} />
                )}
              </Card>

              <Card py="0" gap="0">
                {tab === 'month' ? (
                  <>
                    <KeyValue label="Abonnements mensuels" value={formatEuros(s.monthlySubscriptionsCents)} />
                    <KeyValue label="Annuels et longs, ramenés au mois" value={formatEuros(s.longSubscriptionsPerMonthCents)} last />
                  </>
                ) : (
                  <KeyValue label="Dépensé sur 12 mois" value={formatEuros(s.spentLast12MonthsCents)} last />
                )}
              </Card>
            </>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
