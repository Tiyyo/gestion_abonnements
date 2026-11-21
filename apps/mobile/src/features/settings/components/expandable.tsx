import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react-native';
import { XStack, YStack } from 'tamagui';
import { Body, Label } from '@/ui/text/typography';
import { useColors } from '@/theme/use-colors';
import { haptic } from '@/ui/motion/haptics';
import { Reveal } from '@/ui/motion/reveal';
import { Settle } from '@/ui/motion/settle';

type ExpandableProps = {
  open: boolean;
  onToggle: () => void;
  label: string;
  value: string;
  children: ReactNode;
  last?: boolean;
};

export function Expandable({ open, onToggle, label, value, children, last }: ExpandableProps) {
  const colors = useColors();
  return (
    <Settle>
      <YStack borderBottomWidth={last ? 0 : 1} borderColor="borderColor">
        <XStack
          py="3"
          minH={56}
          items="center"
          gap="3"
          onPress={() => {
            haptic.select();
            onToggle();
          }}
          opacity="1 press:0.7"
          accessible
          tabIndex={0}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`${label} : ${value}`}
        >
          <Body flex={1}>{label}</Body>
          <Label text="right" maxW="55%">
            {value}
          </Label>
          <YStack rotate={open ? '180deg' : '0deg'} transition="smooth">
            <ChevronDown color={colors.muted} size={20} />
          </YStack>
        </XStack>
        {open && (
          <Reveal>
            <YStack pb="4" gap="2">
              {children}
            </YStack>
          </Reveal>
        )}
      </YStack>
    </Settle>
  );
}
