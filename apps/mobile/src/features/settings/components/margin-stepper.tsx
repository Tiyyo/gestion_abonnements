import { Minus, Plus, type LucideIcon } from 'lucide-react-native';
import { Button, XStack } from 'tamagui';
import { marginLabel } from '@/features/settings/labels';
import { Amount } from '@/ui/text/typography';
import { useColors } from '@/theme/use-colors';
import { haptic } from '@/ui/motion/haptics';

const STEP_BP = 50;
const MAX_BP = 500;

interface StepProps {
  icon: LucideIcon;
  label: string;
  disabled: boolean;
  onGlass?: boolean;
  onPress: () => void;
}

function StepButton({ icon: Icon, label, disabled, onGlass, onPress }: StepProps) {
  const colors = useColors();
  return (
    <Button
      w={44}
      h={44}
      p="0"
      bg={onGlass ? 'glassFill' : 'surface'}
      borderWidth={1}
      borderColor={onGlass ? 'glassEdge' : 'borderControl'}
      disabled={disabled}
      opacity={disabled && onGlass ? 0.5 : 1}
      scale="1 press:0.985"
      transition="fast"
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityLabel={label}
    >
      <Icon color={onGlass ? colors.onGlass : colors.text} size={20} />
    </Button>
  );
}

/** `onGlass` : posé sur une carte en verre (premier lancement), boutons en verre et valeur en blanc. */
export function MarginStepper({ value, onChange, onGlass }: { value: number; onChange: (bp: number) => void; onGlass?: boolean }) {
  return (
    <XStack gap="2" items="center">
      <StepButton
        icon={Minus}
        label="Diminuer la marge"
        disabled={value <= 0}
        onGlass={onGlass}
        onPress={() => onChange(Math.max(0, value - STEP_BP))}
      />
      <Amount minW={72} text="center" fontSize={17} fontWeight="700" color={onGlass ? 'onGlass' : 'color'} accessibilityLiveRegion="polite">
        {marginLabel(value)}
      </Amount>
      <StepButton
        icon={Plus}
        label="Augmenter la marge"
        disabled={value >= MAX_BP}
        onGlass={onGlass}
        onPress={() => onChange(Math.min(MAX_BP, value + STEP_BP))}
      />
    </XStack>
  );
}
