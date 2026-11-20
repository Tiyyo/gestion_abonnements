import { useState } from 'react';
import { monthOf, shiftMonth } from '@/features/plan/month';
import { haptic } from '@/ui/motion/haptics';

/** Mois affiché par le Plan et sens du dernier changement (pour l'animation d'entrée). */
export function useMonthSwitcher(today: string) {
  const [[year, month], setMonth] = useState<[number, number]>(() => monthOf(today));
  const [direction, setDirection] = useState(1);
  const goMonth = (delta: 1 | -1) => {
    haptic.select();
    setDirection(delta);
    setMonth(shiftMonth(year, month, delta));
  };
  return { year, month, direction, goMonth };
}
