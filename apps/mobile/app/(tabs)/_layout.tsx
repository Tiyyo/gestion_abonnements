import { BlurTargetView } from 'expo-blur';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { CalendarCheck, House, List, SlidersHorizontal } from 'lucide-react-native';
import { type ComponentRef, useCallback, useRef, useState } from 'react';
import type { View } from 'react-native';
import { YStack } from 'tamagui';

import { haptic } from '../../ui/motion';
import { FloatingTabBar, TabBarBridge } from '../../ui/TabBar';

export default function TabsLayout() {
  const blurTarget = useRef<ComponentRef<typeof View>>(null);
  const [bar, setBar] = useState<BottomTabBarProps | null>(null);
  const renderBar = useCallback((props: BottomTabBarProps) => <TabBarBridge {...props} onProps={setBar} />, []);

  return (
    <YStack flex={1} bg="background">
      <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
        <Tabs
          tabBar={renderBar}
          screenListeners={{ tabPress: () => haptic.select() }}
          screenOptions={{ headerShown: false, animation: 'shift' }}
        >
          <Tabs.Screen name="index" options={{ title: 'Accueil', tabBarIcon: ({ color, size }) => <House color={color} size={size} /> }} />
          <Tabs.Screen
            name="plan"
            options={{ title: 'Plan', tabBarIcon: ({ color, size }) => <CalendarCheck color={color} size={size} /> }}
          />
          <Tabs.Screen
            name="abonnements"
            options={{ title: 'Abonnements', tabBarIcon: ({ color, size }) => <List color={color} size={size} /> }}
          />
          <Tabs.Screen
            name="reglages"
            options={{ title: 'Réglages', tabBarIcon: ({ color, size }) => <SlidersHorizontal color={color} size={size} /> }}
          />
        </Tabs>
      </BlurTargetView>
      {bar ? <FloatingTabBar {...bar} blurTarget={blurTarget} /> : null}
    </YStack>
  );
}
