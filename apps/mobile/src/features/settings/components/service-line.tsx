import { CircleAlert, CircleCheck, CircleMinus, type LucideIcon } from 'lucide-react-native';
import { XStack } from 'tamagui';
import { Body, Caption } from '@/ui/text/typography';
import { colors } from '@/theme/colors';
import type { ServiceState } from '@/features/settings/service-status';

const SERVICE_ICON: Record<ServiceState, { icon: LucideIcon; color: string; tone: 'onGlassOk' | 'onGlassMuted' | 'onGlassWarn' }> = {
  ok: { icon: CircleCheck, color: colors.onGlassOk, tone: 'onGlassOk' },
  off: { icon: CircleMinus, color: colors.onGlassMuted, tone: 'onGlassMuted' },
  warn: { icon: CircleAlert, color: colors.onGlassWarn, tone: 'onGlassWarn' },
};

export function ServiceLine({
  icon: Icon,
  label,
  state,
  status,
}: {
  icon: LucideIcon;
  label: string;
  state: ServiceState;
  status: string;
}) {
  const s = SERVICE_ICON[state];
  return (
    <XStack
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
      accessibilityLabel={`${label} : ${status}`}
    >
      <Icon color={colors.onGlassMuted} size={18} />
      <Body flex={1} color="onGlass">
        {label}
      </Body>
      <s.icon color={s.color} size={14} />
      <Caption color={s.tone} shrink={1} text="right">
        {status}
      </Caption>
    </XStack>
  );
}
