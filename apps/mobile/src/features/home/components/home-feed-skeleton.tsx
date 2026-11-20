import { XStack, YStack } from 'tamagui';
import { RADIUS } from '@/theme/elevation';
import { Skeleton } from '@/ui/feedback/skeleton';
import { SkeletonGroup } from '@/ui/feedback/skeleton-group';
import { SkeletonLine } from '@/ui/feedback/skeleton-line';
import { Card } from '@/ui/surfaces/card';
import { ListCard } from '@/ui/surfaces/list-card';
import { Amount, Body, Caption, Display, Heading, Label, Overline } from '@/ui/text/typography';

function RowSkeleton({ nameW, captionW }: { nameW: `${number}%`; captionW: `${number}%` }) {
  return (
    <ListCard>
      <Skeleton w={44} h={40} radius={10} />
      <YStack flex={1} gap="0.5">
        <SkeletonLine w={nameW}>
          <Label>0</Label>
        </SkeletonLine>
        <SkeletonLine w={captionW}>
          <Caption>0</Caption>
        </SkeletonLine>
      </YStack>
      <SkeletonLine w={64}>
        <Amount>0</Amount>
      </SkeletonLine>
    </ListCard>
  );
}

/** Accueil en cours de chargement : la carte du prochain transfert, le titre de section et deux prélèvements à venir. */
export function HomeFeedSkeleton() {
  return (
    <SkeletonGroup gap="3">
      <Card lift>
        <SkeletonLine w={180}>
          <Overline>0</Overline>
        </SkeletonLine>
        <SkeletonLine w={150} radius={10}>
          <Display>0</Display>
        </SkeletonLine>
        <SkeletonLine w="70%">
          <Body>0</Body>
        </SkeletonLine>
        <XStack gap="3" mt="2">
          <Skeleton h={52} radius={RADIUS.pill} style={{ flex: 1 }} />
          <Skeleton h={52} radius={RADIUS.pill} style={{ flex: 1 }} />
        </XStack>
      </Card>

      <XStack mt="3" minH={44} items="center">
        <SkeletonLine w={200}>
          <Heading>0</Heading>
        </SkeletonLine>
      </XStack>
      <RowSkeleton nameW="45%" captionW="70%" />
      <RowSkeleton nameW="60%" captionW="55%" />
    </SkeletonGroup>
  );
}
