import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, YStack } from 'tamagui';
import type { SubscriptionRow } from '@/db/repositories/subscriptions';
import type { SubscriptionGroup } from '@/features/subscriptions/subscription-groups';
import { Appear } from '@/ui/motion/appear';
import { TAB_BAR_CLEARANCE } from '@/ui/navigation/tab-bar/tab-bar-metrics';
import { CancelledSection } from './cancelled-section';
import { GroupHeader } from './group-header';
import { SubscriptionRowsCard } from './subscription-rows-card';

interface Props {
  groups: readonly SubscriptionGroup[];
  cancelled: readonly SubscriptionRow[];
  globalMarginBp: number;
}

export function SubscriptionList({ groups, cancelled, globalMarginBp }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 20, gap: 24, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}>
      {groups.map((g, index) => (
        <Appear key={g.status} index={index}>
          <YStack gap="2">
            <GroupHeader title={g.title} count={g.rows.length} dot={g.dot} />
            <SubscriptionRowsCard rows={g.rows} globalMarginBp={globalMarginBp} />
          </YStack>
        </Appear>
      ))}
      {cancelled.length > 0 ? <CancelledSection rows={cancelled} globalMarginBp={globalMarginBp} /> : null}
    </ScrollView>
  );
}
