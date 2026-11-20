import { Minus, Plus, type LucideIcon } from 'lucide-react-native';
import { Button, XStack } from 'tamagui';
import { marginLabel } from '@/features/settings/labels';
import { Amount } from '@/ui/text/typography';
import { colors } from '@/theme/colors';
import { haptic } from '@/ui/motion/haptics';

const STEP_BP = 50;
const MAX_BP = 500;

function StepButton({ icon: Icon, label, disabled, onPress }: { icon: LucideIcon; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Button
      w={44}
      h={44}
      p="0"
      bg="surface"
      borderWidth={1}
      borderColor="borderControl"
      disabled={disabled}
      scale="1 press:0.985"
      transition="fast"
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityLabel={label}
    >
      <Icon color={colors.text} size={20} />
    </Button>
  );
}

export function MarginStepper({ value, onChange }: { value: number; onChange: (bp: number) => void }) {
  return (
    <XStack gap="2" items="center">
      <StepButton icon={Minus} label="Diminuer la marge" disabled={value <= 0} onPress={() => onChange(Math.max(0, value - STEP_BP))} />
      <Amount minW={72} text="center" fontSize={17} fontWeight="700">
        {marginLabel(value)}
      </Amount>
      <StepButton
        icon={Plus}
        label="Augmenter la marge"
        disabled={value >= MAX_BP}
        onPress={() => onChange(Math.min(MAX_BP, value + STEP_BP))}
      />
    </XStack>
  );
}
