import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';

/** Un onglet tel que la barre flottante le dessine. */
export type TabItem = {
  route: BottomTabBarProps['state']['routes'][number];
  index: number;
  options: BottomTabBarProps['descriptors'][string]['options'];
  label: string;
};

export function tabItems({ state, descriptors }: Pick<BottomTabBarProps, 'state' | 'descriptors'>): TabItem[] {
  return state.routes.map((route, index) => {
    const { options } = descriptors[route.key];
    return { route, index, options, label: options.title ?? route.name };
  });
}
