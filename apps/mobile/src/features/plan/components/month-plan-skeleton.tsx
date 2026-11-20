import { XStack, YStack } from 'tamagui';
import { RADIUS } from '@/theme/elevation';
import { Skeleton } from '@/ui/feedback/skeleton';
import { SkeletonGroup } from '@/ui/feedback/skeleton-group';
import { SkeletonLine } from '@/ui/feedback/skeleton-line';
import { Card } from '@/ui/surfaces/card';
import { Amount, Body, Caption, Display, Heading, Label, Overline } from '@/ui/text/typography';

function PaydayLineSkeleton({ labelW }: { labelW: `${number}%` }) {
  return (
    <XStack justify="space-between" gap="3">
      <SkeletonLine w={labelW}>
        <Body>0</Body>
      </SkeletonLine>
      <SkeletonLine w={64}>
        <Amount>0</Amount>
      </SkeletonLine>
    </XStack>
  );
}

function TransferRowSkeleton({ titleW }: { titleW: `${number}%` }) {
  return (
    <Card p="0" gap="0">
      <XStack items="center" minH={64}>
        <YStack w={56} h={64} items="center" justify="center">
          <Skeleton w={26} h={26} radius={13} />
        </YStack>
        <YStack flex={1} py="3" gap="0.5">
          <SkeletonLine w={titleW}>
            <Label>0</Label>
          </SkeletonLine>
          <SkeletonLine w="80%">
            <Caption>0</Caption>
          </SkeletonLine>
        </YStack>
        <YStack px="4">
          <SkeletonLine w={64}>
            <Amount fontSize={16}>0</Amount>
          </SkeletonLine>
        </YStack>
      </XStack>
    </Card>
  );
}

/** Plan d'un mois en cours de chargement : carte du virement de paie, titre de section et deux transferts. */
export function MonthPlanSkeleton() {
  return (
    <SkeletonGroup p="4" gap="3">
      <Card>
        <SkeletonLine w={190}>
          <Overline>0</Overline>
        </SkeletonLine>
        <SkeletonLine w={160} radius={10}>
          <Display>0</Display>
        </SkeletonLine>
        <SkeletonLine w={170}>
          <Caption>0</Caption>
        </SkeletonLine>
        <YStack borderTopWidth={1} borderColor="borderColor" mt="1" pt="3" gap="2">
          <PaydayLineSkeleton labelW="55%" />
          <PaydayLineSkeleton labelW="40%" />
        </YStack>
        <XStack mt="2">
          <Skeleton h={52} radius={RADIUS.pill} style={{ flex: 1 }} />
        </XStack>
      </Card>

      <XStack mt="3" minH={44} items="center">
        <SkeletonLine w={230}>
          <Heading>0</Heading>
        </SkeletonLine>
      </XStack>
      <TransferRowSkeleton titleW="65%" />
      <TransferRowSkeleton titleW="50%" />
    </SkeletonGroup>
  );
}
