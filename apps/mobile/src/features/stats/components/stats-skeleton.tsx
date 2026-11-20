import { XStack, YStack } from 'tamagui';
import { Skeleton } from '@/ui/feedback/skeleton';
import { SkeletonGroup } from '@/ui/feedback/skeleton-group';
import { SkeletonLine } from '@/ui/feedback/skeleton-line';
import { Card } from '@/ui/surfaces/card';
import { KeyValueSkeleton } from '@/ui/surfaces/key-value-skeleton';
import { Amount, CardTitle, Label } from '@/ui/text/typography';

const BARS: readonly { labelW: number; barW: `${number}%` }[] = [
  { labelW: 110, barW: '100%' },
  { labelW: 80, barW: '62%' },
  { labelW: 130, barW: '38%' },
  { labelW: 70, barW: '20%' },
];

/** Statistiques en cours de chargement : la carte de répartition avec quatre barres, puis la carte de détail. */
export function StatsSkeleton() {
  return (
    <SkeletonGroup gap="3">
      <Card lift gap="3">
        <CardTitle>Répartition par catégorie</CardTitle>
        <YStack gap="3">
          {BARS.map((bar) => (
            <YStack key={bar.barW} gap="1">
              <XStack justify="space-between" gap="3">
                <SkeletonLine w={bar.labelW}>
                  <Label>0</Label>
                </SkeletonLine>
                <SkeletonLine w={96}>
                  <Amount fontWeight="400">0</Amount>
                </SkeletonLine>
              </XStack>
              <Skeleton h={8} w={bar.barW} radius={4} />
            </YStack>
          ))}
        </YStack>
      </Card>
      <Card py="0" gap="0">
        <KeyValueSkeleton labelW="50%" valueW={72} />
        <KeyValueSkeleton labelW="65%" valueW={72} last />
      </Card>
    </SkeletonGroup>
  );
}
