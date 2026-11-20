import { BlurTargetView } from 'expo-blur';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { type ComponentRef, useCallback, useRef, useState } from 'react';
import type { View } from 'react-native';
import { YStack } from 'tamagui';
import { TABS } from '@/features/app-shell/tab-definitions';
import { haptic } from '@/ui/motion/haptics';
import { FloatingTabBar } from '@/ui/navigation/tab-bar/floating-tab-bar';
import { TabBarBridge } from '@/ui/navigation/tab-bar/tab-bar-bridge';

export default function TabsLayout() {
  // Vue floutée par la barre d'onglets : tout le contenu des onglets, mais pas la barre elle-même.
  const blurTarget = useRef<ComponentRef<typeof View>>(null);
  // La barre intégrée ne dessine rien : le pont remonte ses props pour que la barre flottante soit rendue hors de la vue floutée.
  const [bar, setBar] = useState<BottomTabBarProps | null>(null);
  const renderBar = useCallback((props: BottomTabBarProps) => <TabBarBridge {...props} onProps={setBar} />, []);

  return (
    <YStack flex={1} bg="background">
      <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
        <Tabs
          tabBar={renderBar}
          screenListeners={{ tabPress: () => haptic.select() }}
          screenOptions={{ headerShown: false, animation: 'shift', lazy: false }}
        >
          {TABS.map(({ name, title, icon: Icon }) => (
            <Tabs.Screen key={name} name={name} options={{ title, tabBarIcon: ({ color, size }) => <Icon color={color} size={size} /> }} />
          ))}
        </Tabs>
      </BlurTargetView>
      {bar ? <FloatingTabBar {...bar} blurTarget={blurTarget} /> : null}
    </YStack>
  );
}
