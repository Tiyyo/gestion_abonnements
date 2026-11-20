import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/** Ordonnée écran du haut du clavier quand il est ouvert, sinon `null`. */
export function useKeyboardTop(): number | null {
  const [top, setTop] = useState<number | null>(null);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => setTop(event.endCoordinates.screenY));
    const hide = Keyboard.addListener('keyboardDidHide', () => setTop(null));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return top;
}
