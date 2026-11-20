import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { XStack } from 'tamagui';
import { colors } from '@/theme/colors';

export function FormRow({ icon: Icon, children, last }: { icon: LucideIcon; children: ReactNode; last?: boolean }) {
  return (
    <XStack minH={56} py="3" gap="3" items="center" borderBottomWidth={last ? 0 : 1} borderColor="borderColor">
      <Icon color={colors.muted} size={20} />
      {children}
    </XStack>
  );
}
