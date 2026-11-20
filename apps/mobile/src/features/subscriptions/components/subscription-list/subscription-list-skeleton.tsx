import { XStack, YStack } from 'tamagui';
import { RADIUS } from '@/theme/elevation';
import { Skeleton } from '@/ui/feedback/skeleton';
import { SkeletonGroup } from '@/ui/feedback/skeleton-group';
import { SkeletonLine } from '@/ui/feedback/skeleton-line';
import { Card } from '@/ui/surfaces/card';
import { Amount, Caption, Label, Overline } from '@/ui/text/typography';

function LineSkeleton({ nameW, last }: { nameW: `${number}%`; last?: boolean }) {
  return (
    <XStack py="3" gap="3" items="center" minH={64} borderBottomWidth={last ? 0 : 1} borderColor="borderColor">
      <Skeleton w={44} h={44} radius={RADIUS.control} />
      <YStack flex={1} gap="0.5">
        <SkeletonLine w={nameW}>
          <Label fontSize={16}>0</Label>
        </SkeletonLine>
        <SkeletonLine w="75%">
          <Caption>0</Caption>
        </SkeletonLine>
      </YStack>
      <YStack items="flex-end">
        <SkeletonLine w={60}>
          <Amount fontSize={16}>0</Amount>
        </SkeletonLine>
        <SkeletonLine w={44}>
          <Caption>0</Caption>
        </SkeletonLine>
      </YStack>
    </XStack>
  );
}

/** Liste des abonnements en cours de chargement : un en-tête de groupe et trois lignes. */
export function SubscriptionListSkeleton() {
  return (
    <SkeletonGroup p="4" pt="5" gap="2">
      <XStack px="1" items="center" gap="2">
        <Skeleton w={8} h={8} radius={4} />
        <SkeletonLine w={96}>
          <Overline>0</Overline>
        </SkeletonLine>
      </XStack>
      <Card py="0" gap="0">
        <LineSkeleton nameW="45%" />
        <LineSkeleton nameW="60%" />
        <LineSkeleton nameW="35%" last />
      </Card>
    </SkeletonGroup>
  );
}
