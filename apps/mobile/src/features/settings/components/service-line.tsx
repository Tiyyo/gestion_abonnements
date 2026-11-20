import { ChevronRight, CircleAlert, CircleCheck, CircleMinus, type LucideIcon } from 'lucide-react-native';
import { XStack } from 'tamagui';
import { haptic } from '@/ui/motion/haptics';
import { Body, Caption } from '@/ui/text/typography';
import { useColors } from '@/theme/use-colors';
import type { ServiceState } from '@/features/settings/service-status';

const SERVICE_ICON: Record<ServiceState, { icon: LucideIcon; tone: 'onGlassOk' | 'onGlassMuted' | 'onGlassWarn' }> = {
  ok: { icon: CircleCheck, tone: 'onGlassOk' },
  off: { icon: CircleMinus, tone: 'onGlassMuted' },
  warn: { icon: CircleAlert, tone: 'onGlassWarn' },
};

export function ServiceLine({
  icon: Icon,
  label,
  state,
  status,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  state: ServiceState;
  status: string;
  onPress?: () => void;
}) {
  const colors = useColors();
  const s = SERVICE_ICON[state];
  const press = onPress
    ? {
        onPress: () => {
          haptic.select();
          onPress();
        },
        opacity: '1 press:0.75' as const,
        transition: 'fast' as const,
        accessibilityRole: 'button' as const,
      }
    : {};
  return (
    <XStack
      {...press}
      minH={44}
      px="3"
      py="2"
      gap="3"
      items="center"
      bg="glassInner"
      borderWidth={1}
      borderColor="glassEdge"
      rounded={16}
      accessible
      accessibilityLabel={onPress ? `${label} : ${status}. Renouveler l’accord` : `${label} : ${status}`}
    >
      <Icon color={colors.onGlassMuted} size={18} />
      <Body flex={1} color="onGlass">
        {label}
      </Body>
      <s.icon color={colors[s.tone]} size={14} />
      <Caption color={s.tone} shrink={1} text="right">
        {status}
      </Caption>
      {onPress ? <ChevronRight color={colors.onGlassMuted} size={16} /> : null}
    </XStack>
  );
}
