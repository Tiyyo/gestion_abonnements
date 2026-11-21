import { formatEuros } from '@abonnements/core';
import { router } from 'expo-router';
import { YStack } from 'tamagui';
import type { HomeReview } from '@/db/repositories/home/types';
import { reviewAccessibilityLabel, reviewCaption } from '@/features/home/home-wording';
import { Appear } from '@/ui/motion/appear';
import { ListCard } from '@/ui/surfaces/list-card';
import { SectionTitle } from '@/ui/text/section-title';
import { Amount, Caption, Label } from '@/ui/text/typography';

/** Prélèvements passés dont on ne sait pas encore s'ils sont passés ou ont échoué. */
export function ReviewList({ reviews }: { reviews: HomeReview[] }) {
  if (reviews.length === 0) {
    return null;
  }
  return (
    <>
      <SectionTitle>À vérifier</SectionTitle>
      {reviews.map((r, index) => (
        <Appear key={r.chargeId} index={index + 2}>
          <ListCard
            onPress={() => router.push(`/charges/${r.chargeId}`)}
            accessibilityLabel={reviewAccessibilityLabel(r)}
            accessibilityHint="Ouvre le rapprochement"
          >
            <YStack flex={1} gap="0.5">
              <Label>{r.name}</Label>
              <Caption>{reviewCaption(r)}</Caption>
            </YStack>
            <Amount>{formatEuros(r.expectedAmountCents)}</Amount>
          </ListCard>
        </Appear>
      ))}
    </>
  );
}
