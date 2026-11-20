import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, YStack } from 'tamagui';
import { noMatchMessage, type SubscriptionSort, type SubscriptionView } from '@/features/subscriptions/subscription-view';
import { ActionButton } from '@/ui/controls/action-button';
import { EmptyState } from '@/ui/feedback/empty-state';
import { Appear } from '@/ui/motion/appear';
import { TAB_BAR_CLEARANCE } from '@/ui/navigation/tab-bar/tab-bar-metrics';
import { CancelledSection } from './cancelled-section';
import { GroupHeader } from './group-header';
import { SortControl } from './sort-control';
import { SubscriptionRowsCard } from './subscription-rows-card';

interface Props {
  view: SubscriptionView;
  globalMarginBp: number;
  sort: SubscriptionSort;
  onSort: (sort: SubscriptionSort) => void;
  onClearSearch: () => void;
}

export function SubscriptionList({ view, globalMarginBp, sort, onSort, onClearSearch }: Props) {
  const insets = useSafeAreaInsets();
  const { groups, cancelled } = view;
  // La marge du bas reste celle de la barre d'onglets même clavier ouvert (barre masquée) : la dernière ligne garde de l'air au-dessus du clavier.
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={{ padding: 16, paddingTop: 20, gap: 24, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
    >
      {view.toolsVisible && !view.noMatch ? <SortControl value={sort} onChange={onSort} /> : null}
      {view.noMatch ? (
        <EmptyState
          message={noMatchMessage(view.query)}
          action={<ActionButton label="Effacer la recherche" variant="soft" size="sm" onPress={onClearSearch} />}
        />
      ) : null}
      {groups.map((g, index) => (
        <Appear key={g.status} index={index}>
          <YStack gap="2">
            <GroupHeader title={g.title} count={g.rows.length} dot={g.dot} />
            <SubscriptionRowsCard rows={g.rows} globalMarginBp={globalMarginBp} />
          </YStack>
        </Appear>
      ))}
      {cancelled.length > 0 && view.searching ? (
        <Appear key="cancelled" index={groups.length}>
          <YStack gap="2">
            <GroupHeader title="Résiliés" count={cancelled.length} />
            <SubscriptionRowsCard rows={cancelled} globalMarginBp={globalMarginBp} />
          </YStack>
        </Appear>
      ) : null}
      {cancelled.length > 0 && !view.searching ? <CancelledSection rows={cancelled} globalMarginBp={globalMarginBp} /> : null}
    </ScrollView>
  );
}
