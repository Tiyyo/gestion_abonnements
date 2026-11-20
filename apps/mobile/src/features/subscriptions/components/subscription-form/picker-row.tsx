import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { XStack } from 'tamagui';
import { colors } from '@/theme/colors';
import { Body } from '@/ui/text/typography';

interface Props {
  icon: LucideIcon;
  label: string;
  value: string;
  onPress: () => void;
  last?: boolean;
}

export function PickerRow({ icon: Icon, label, value, onPress, last }: Props) {
  return (
    <XStack
      minH={56}
      py="3"
      gap="3"
      items="center"
      borderBottomWidth={last ? 0 : 1}
      borderColor="borderColor"
      onPress={onPress}
      opacity="1 press:0.6"
      transition="fast"
      accessibilityRole="button"
      accessibilityLabel={`${label} : ${value}. Modifier`}
    >
      <Icon color={colors.muted} size={20} />
      <Body>{label}</Body>
      <Body flex={1} text="right" color="colorMuted" numberOfLines={1}>
        {value}
      </Body>
      <ChevronRight color={colors.muted} size={18} />
    </XStack>
  );
}
