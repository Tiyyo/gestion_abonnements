import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack, YStack } from 'tamagui';
import { StatusBadge } from '@/features/subscriptions/components/status-badge';
import { SubscriptionAvatar } from '@/features/subscriptions/components/subscription-avatar';
import { heroAmountCaption, heroFacts } from '@/features/subscriptions/detail-hero';
import type { SubscriptionDetail } from '@/features/subscriptions/load-subscription-detail';
import { HERO_OVERLAP, TOP_GAP } from '@/theme/layout';
import { ActionButton } from '@/ui/controls/action-button';
import { StackHeader } from '@/ui/navigation/stack-header';
import { GlassCard } from '@/ui/surfaces/glass-card';
import { GlassKeyValue } from '@/ui/surfaces/glass-key-value';
import { Hero } from '@/ui/surfaces/hero';
import { HeroAmount } from '@/ui/text/hero-amount';
import { Caption, CardTitle } from '@/ui/text/typography';

type Props = Pick<SubscriptionDetail, 'row' | 'nextCharge' | 'today'>;

/** En-tête de la fiche sur dégradé : identité et statut, montant et rythme, puis les échéances du statut. */
export function DetailHero({ row, nextCharge, today }: Props) {
  const insets = useSafeAreaInsets();
  const facts = heroFacts(row, nextCharge, today);
  return (
    <Hero pt={insets.top + TOP_GAP.stack} pb={HERO_OVERLAP + 20} gap="4">
      <StackHeader
        onHero
        trailing={<ActionButton label="Modifier" variant="glassGhost" onPress={() => router.push(`/subscriptions/edit/${row.id}`)} />}
      />
      <YStack px="4">
        <GlassCard>
          <XStack gap="3" items="center">
            <SubscriptionAvatar name={row.name} iconKey={row.icon_key} size={52} />
            <YStack flex={1} minW={0} gap="0.5">
              <CardTitle color="onGlass" numberOfLines={2}>
                {row.name}
              </CardTitle>
              <Caption color="onGlassMuted" numberOfLines={1}>
                {row.category_name}
              </Caption>
            </YStack>
            <StatusBadge status={row.status} onGlass />
          </XStack>
          <YStack>
            <HeroAmount cents={row.amount_cents} />
            <Caption color="onGlassMuted">{heroAmountCaption(row)}</Caption>
          </YStack>
          {facts.length > 0 ? (
            <YStack mb={-6}>
              {facts.map((fact) => (
                <GlassKeyValue key={fact.label} label={fact.label} value={fact.value} />
              ))}
            </YStack>
          ) : null}
        </GlassCard>
      </YStack>
    </Hero>
  );
}
