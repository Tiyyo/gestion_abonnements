import { ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { XStack, YStack } from 'tamagui';
import type { SubscriptionRow } from '@/db/repositories/subscriptions';
import { colors } from '@/theme/colors';
import { haptic } from '@/ui/motion/haptics';
import { Reveal } from '@/ui/motion/reveal';
import { Settle } from '@/ui/motion/settle';
import { Caption } from '@/ui/text/typography';
import { GroupHeader } from './group-header';
import { SubscriptionRowsCard } from './subscription-rows-card';

/** Résiliés repliés par défaut, en bas de liste. */
export function CancelledSection({ rows, globalMarginBp }: { rows: readonly SubscriptionRow[]; globalMarginBp: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Settle>
      <YStack gap="2">
        <XStack
          px="1"
          minH={44}
          items="center"
          justify="space-between"
          onPress={() => {
            haptic.select();
            setExpanded((v) => !v);
          }}
          opacity="1 press:0.6"
          transition="fast"
          accessible
          tabIndex={0}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={`${expanded ? 'Masquer' : 'Afficher'} les abonnements résiliés, ${rows.length}`}
        >
          <GroupHeader title="Résiliés" count={rows.length} />
          <XStack items="center" gap="1">
            <Caption color="primary" fontWeight="600">
              {expanded ? 'Masquer' : 'Afficher'}
            </Caption>
            <YStack rotate={expanded ? '180deg' : '0deg'} transition="smooth">
              <ChevronDown color={colors.primary} size={18} />
            </YStack>
          </XStack>
        </XStack>
        {expanded ? (
          <Reveal>
            <SubscriptionRowsCard rows={rows} globalMarginBp={globalMarginBp} />
          </Reveal>
        ) : null}
      </YStack>
    </Settle>
  );
}
