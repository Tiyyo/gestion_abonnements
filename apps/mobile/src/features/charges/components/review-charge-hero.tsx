import { YStack } from 'tamagui';
import type { useReviewForm } from '@/features/charges/hooks/use-review-form';
import { reviewAmountHint, reviewIntro } from '@/features/charges/review-labels';
import type { ChargeToReview } from '@/features/charges/types';
import { SubscriptionAvatar } from '@/features/subscriptions/components/subscription-avatar';
import { dateShort } from '@/lib/dates';
import { GlassAmountInput } from '@/ui/controls/glass-amount-input';
import { GlassCard } from '@/ui/surfaces/glass-card';
import { Hero } from '@/ui/surfaces/hero';
import { Caption, CardTitle } from '@/ui/text/typography';

interface Props {
  row: ChargeToReview;
  form: ReturnType<typeof useReviewForm>;
}

/** Aperçu du prélèvement sur le dégradé, comme le prélèvement non prévu : abonnement à gauche, montant débité à droite. */
export function ReviewChargeHero({ row, form }: Props) {
  return (
    <Hero px="4" pt="2" pb="5" gap="3">
      <Caption color="onGlassMuted" px="1">
        {reviewIntro(row)}
      </Caption>
      <GlassCard flexDirection="row" items="center" gap="3" p="3.5">
        <SubscriptionAvatar name={row.name} iconKey={row.icon_key} size={52} />
        <YStack flex={1} minW={0} gap="0.5">
          <CardTitle color="onGlass" numberOfLines={1}>
            {row.name}
          </CardTitle>
          <Caption color="onGlassMuted" numberOfLines={1}>
            {`Prévu le ${dateShort(row.due_date)}`}
          </Caption>
        </YStack>
        <GlassAmountInput value={form.amount} onChangeText={form.setAmount} accessibilityLabel="Montant débité, en euros" />
      </GlassCard>
      <YStack px="1" gap="1">
        <Caption color="onGlassMuted">{reviewAmountHint(row)}</Caption>
        {form.validAmount ? null : (
          <Caption color="onGlassDanger" accessibilityLiveRegion="polite">
            Montant invalide, par exemple 9,99
          </Caption>
        )}
      </YStack>
    </Hero>
  );
}
