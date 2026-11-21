import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { XStack, YStack } from 'tamagui';
import { PILL_HEIGHT, PILL_RADIUS, ROW_GAP, ROW_PADDING } from './tab-bar-metrics';
import type { TabItem } from './tab-item';

/** Zones tactiles posées au-dessus des libellés et des capsules : elles portent le rôle `tab` et l'accessibilité. */
export function TabPressTargets({
  tabs,
  focusedIndex,
  emitter,
  navigateToTab,
  onSelect,
}: Pick<BottomTabBarProps, 'emitter' | 'navigateToTab'> & { tabs: TabItem[]; focusedIndex: number; onSelect: (index: number) => void }) {
  return (
    <XStack position="absolute" t={0} b={0} l={ROW_PADDING} r={ROW_PADDING} gap={ROW_GAP} items="center">
      {tabs.map(({ route, index, options, label }) => {
        const focused = index === focusedIndex;
        return (
          <YStack
            key={route.key}
            flex={1}
            h={PILL_HEIGHT}
            rounded={PILL_RADIUS}
            onPress={() => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                onSelect(index);
                navigateToTab(route.key);
              }
            }}
            onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
            accessible
            tabIndex={0}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            testID={options.tabBarButtonTestID}
          />
        );
      })}
    </XStack>
  );
}
