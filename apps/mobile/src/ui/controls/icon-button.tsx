import { type LucideIcon } from 'lucide-react-native';
import { Button } from 'tamagui';
import { useColors } from '@/theme/use-colors';
import { RADIUS } from '@/theme/elevation';
import { useShadows } from '@/theme/use-shadows';

export function IconButton({
  icon: Icon,
  label,
  onPress,
  variant = 'surface',
  testID,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  variant?: 'surface' | 'primary' | 'ghost' | 'glass';
  testID?: string;
}) {
  const colors = useColors();
  const shadow = useShadows();
  const primary = variant === 'primary';
  const glass = variant === 'glass';
  return (
    <Button
      w={48}
      h={48}
      p="0"
      rounded={RADIUS.pill}
      bg={primary ? 'primary' : glass ? 'glassFill' : variant === 'ghost' ? 'transparent' : 'surface'}
      borderWidth={1}
      borderColor={glass ? 'glassEdge' : 'transparent'}
      style={primary ? { boxShadow: shadow.glow } : variant === 'surface' ? { boxShadow: shadow.sm } : undefined}
      opacity="1 press:0.75"
      scale="1 press:0.985"
      transition="fast"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
    >
      <Icon color={primary ? colors.onPrimary : glass ? colors.onGlass : colors.text} size={22} strokeWidth={2} />
    </Button>
  );
}
