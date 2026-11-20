import { BlurView, type BlurMethod } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { type ComponentRef, type RefObject, useState } from 'react';
import { StyleSheet, type View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack, YStack } from 'tamagui';
import { colors } from '@/theme/colors';
import { elevated, RADIUS } from '@/theme/elevation';
import { useKeyboardVisible } from '@/ui/hooks/use-keyboard-visible';
import { IrisPill } from './iris-pill';
import { BAR_GAP, BAR_HEIGHT, ROW_GAP, ROW_PADDING } from './tab-bar-metrics';
import { TabContent } from './tab-content';
import { tabItems } from './tab-item';
import { TabPressTargets } from './tab-press-targets';
import { useActiveTab } from './use-active-tab';

// Flou réel sous Android : la bibliothèque Dimezis redessine la cible à chaque image.
// Sur Android 11 (SDK 30), elle coûte du GPU : passer à 'none' si le défilement saccade (la teinte barFill reste lisible seule).
const ANDROID_BLUR: BlurMethod = 'dimezisBlurView';

export function FloatingTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  blurTarget,
}: BottomTabBarProps & { blurTarget: RefObject<ComponentRef<typeof View> | null> }) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const [rowWidth, setRowWidth] = useState(0);
  const count = state.routes.length;
  const slot = rowWidth > 0 ? (rowWidth - ROW_PADDING * 2 - ROW_GAP * (count - 1)) / count : 0;
  const [active, setActive] = useActiveTab(state.index);

  if (keyboardVisible) {
    return null;
  }

  const tabs = tabItems({ state, descriptors });

  return (
    <YStack
      position="absolute"
      l={14}
      r={14}
      b={insets.bottom + BAR_GAP}
      h={BAR_HEIGHT}
      rounded={RADIUS.glass}
      style={elevated('bar')}
      pointerEvents="box-none"
    >
      <YStack flex={1} rounded={RADIUS.glass} overflow="hidden" borderWidth={1} borderColor="barEdge">
        <BlurView style={StyleSheet.absoluteFill} tint="light" intensity={60} blurMethod={ANDROID_BLUR} blurTarget={blurTarget} />
        <XStack
          flex={1}
          bg="barFill"
          px={ROW_PADDING}
          items="center"
          gap={ROW_GAP}
          role="tablist"
          onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
        >
          {tabs.map(({ route, options, label }) => (
            <TabContent
              key={route.key}
              label={label}
              color="colorMuted"
              icon={options.tabBarIcon?.({ focused: false, color: colors.muted, size: 22 })}
            />
          ))}

          {slot > 0
            ? tabs.map(({ route, index, options, label }) => (
                <IrisPill key={route.key} active={index === active} left={ROW_PADDING + index * (slot + ROW_GAP)} width={slot}>
                  <TabContent
                    label={label}
                    color="onPrimary"
                    icon={options.tabBarIcon?.({ focused: true, color: colors.onPrimary, size: 22 })}
                  />
                </IrisPill>
              ))
            : null}

          <TabPressTargets tabs={tabs} focusedIndex={state.index} emitter={emitter} navigateToTab={navigateToTab} onSelect={setActive} />
        </XStack>
      </YStack>
    </YStack>
  );
}
