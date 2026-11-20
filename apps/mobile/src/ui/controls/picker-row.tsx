import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { XStack } from 'tamagui';
import { useColors } from '@/theme/use-colors';
import { Body } from '@/ui/text/typography';

interface Props {
  icon: LucideIcon;
  label: string;
  value: string;
  onPress: () => void;
  last?: boolean;
  testID?: string;
}

export function PickerRow({ icon: Icon, label, value, onPress, last, testID }: Props) {
  const colors = useColors();
  return (
    <XStack
      minH={56}
      py="3"
      gap="3"
      items="center"
      borderBottomWidth={last ? 0 : 1}
      borderColor="borderColor"
      onPress={onPress}
      testID={testID}
      opacity="1 press:0.6"
      transition="fast"
      accessible
      tabIndex={0}
      accessibilityRole="button"
      accessibilityLabel={`${label} : ${value}`}
      accessibilityHint="Ouvre la liste des choix"
    >
      <Icon color={colors.muted} size={20} />
      <Body shrink={1}>{label}</Body>
      {/* La valeur passe à la ligne plutôt que d'être tronquée (police agrandie). */}
      <Body flex={1} text="right" color="colorMuted">
        {value}
      </Body>
      <ChevronRight color={colors.muted} size={18} />
    </XStack>
  );
}
