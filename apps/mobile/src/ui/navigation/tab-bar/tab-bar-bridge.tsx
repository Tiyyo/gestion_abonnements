import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Le navigateur appelle `tabBar` à l'intérieur de la scène : on remonte ses props pour dessiner la barre hors de la cible floutée.
 * `state` est un nouvel objet à chaque rendu du navigateur : on ne remonte que si l'onglet actif ou la liste des onglets change,
 * sinon setState → rendu du layout → rendu du navigateur → nouveau `state` → boucle infinie.
 */
export function TabBarBridge({ onProps, ...props }: BottomTabBarProps & { onProps: (props: BottomTabBarProps) => void }) {
  const signature = `${props.state.index}:${props.state.routes.map((r) => r.key).join(',')}`;
  const latest = useRef(props);
  // Mis à jour après chaque rendu, avant l'effet ci-dessous (les effets de layout passent avant les effets passifs).
  useLayoutEffect(() => {
    latest.current = props;
  });
  useEffect(() => {
    onProps(latest.current);
  }, [signature, onProps]);
  return null;
}
