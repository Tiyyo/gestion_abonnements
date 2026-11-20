import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack, YStack } from 'tamagui';
import { RADIUS } from '@/theme/elevation';
import { TOP_GAP } from '@/theme/layout';
import { Skeleton } from '@/ui/feedback/skeleton';
import { SkeletonGroup } from '@/ui/feedback/skeleton-group';
import { SkeletonLine } from '@/ui/feedback/skeleton-line';
import { useDelayedFlag } from '@/ui/hooks/use-delayed-flag';
import { StackHeader } from '@/ui/navigation/stack-header';
import { Card } from '@/ui/surfaces/card';
import { KeyValueSkeleton } from '@/ui/surfaces/key-value-skeleton';
import { Body, Caption, Heading, Label, ScreenTitle } from '@/ui/text/typography';

function HistoryItemSkeleton({ labelW }: { labelW: `${number}%` }) {
  return (
    <XStack gap="3" items="flex-start">
      <YStack mt="1.5">
        <Skeleton w={10} h={10} radius={5} />
      </YStack>
      <YStack flex={1} gap="0.5">
        <SkeletonLine w={labelW}>
          <Label>0</Label>
        </SkeletonLine>
        <SkeletonLine w={90}>
          <Caption>0</Caption>
        </SkeletonLine>
      </YStack>
    </XStack>
  );
}

function DetailBodySkeleton() {
  return (
    <SkeletonGroup flex={1} p="4" pt="1" gap="4">
      <XStack gap="3" items="center">
        <Skeleton w={56} h={56} radius={RADIUS.control} />
        <YStack flex={1} gap="0.5">
          <SkeletonLine w="65%" radius={8}>
            <ScreenTitle>0</ScreenTitle>
          </SkeletonLine>
          <SkeletonLine w="35%">
            <Body>0</Body>
          </SkeletonLine>
        </YStack>
      </XStack>
      <Card py="0" gap="0">
        <KeyValueSkeleton labelW="30%" valueW={120} />
        <KeyValueSkeleton labelW="50%" valueW={140} />
        <KeyValueSkeleton labelW="40%" valueW={110} />
        <KeyValueSkeleton labelW="45%" valueW={90} last />
      </Card>
      <YStack gap="3">
        <SkeletonLine w={110}>
          <Heading>0</Heading>
        </SkeletonLine>
        <HistoryItemSkeleton labelW="55%" />
        <HistoryItemSkeleton labelW="40%" />
      </YStack>
    </SkeletonGroup>
  );
}

/** Fiche en cours de chargement : le cadre de l'écran tout de suite (retour possible), les blocs fantômes si l'attente se prolonge. */
export function DetailSkeleton() {
  const insets = useSafeAreaInsets();
  const visible = useDelayedFlag(true);
  return (
    <YStack flex={1} bg="background" pt={insets.top + TOP_GAP.stack}>
      <StackHeader />
      {visible ? <DetailBodySkeleton /> : <YStack flex={1} />}
      <XStack p="4" pb={insets.bottom + 16} gap="3" borderTopWidth={1} borderColor="borderColor" bg="surface">
        {visible ? <Skeleton h={56} radius={RADIUS.pill} style={{ flex: 1 }} /> : <YStack h={56} />}
      </XStack>
    </YStack>
  );
}
