import { Pencil } from 'lucide-react-native';
import { YStack } from 'tamagui';
import { SubscriptionAvatar } from '@/features/subscriptions/components/subscription-avatar';
import { colors } from '@/theme/colors';
import { formStyles } from './form-styles';

/** Logo de l'aperçu, avec une pastille crayon : ouvre le choix du logo. */
export function LogoButton({
  name,
  iconKey,
  label,
  onPress,
}: {
  name: string;
  iconKey: string | null;
  label: string;
  onPress: () => void;
}) {
  return (
    <YStack
      onPress={onPress}
      scale="1 press:0.985"
      transition="fast"
      accessibilityRole="button"
      accessibilityLabel={`Logo : ${label}. Changer`}
    >
      <SubscriptionAvatar name={name || '?'} iconKey={iconKey} size={52} />
      <YStack
        w={22}
        h={22}
        rounded="full"
        items="center"
        justify="center"
        bg="primary"
        borderWidth={2}
        borderColor="glassEdge"
        style={formStyles.badge}
      >
        <Pencil color={colors.onPrimary} size={11} strokeWidth={2.5} />
      </YStack>
    </YStack>
  );
}
