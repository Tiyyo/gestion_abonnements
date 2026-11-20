import type { ComponentProps } from 'react';
import { Input } from 'tamagui';

/** Champ de saisie des écrans de prélèvement (48 px de haut, bordure de contrôle). */
export function FormInput(props: ComponentProps<typeof Input>) {
  return <Input minH={48} fontSize={16} bg="surface" borderColor="borderControl" {...props} />;
}
