import { Button, Spinner } from 'tamagui';
import { elevated, RADIUS, type ShadowLevel } from '@/theme/elevation';
import { haptic } from '@/ui/motion/haptics';

export type ButtonVariant =
  'primary' | 'secondary' | 'soft' | 'outline' | 'onAccent' | 'danger' | 'dangerSolid' | 'warn' | 'ghost' | 'glassGhost';

const BUTTONS: Record<ButtonVariant, { bg: string; border: string; fg: string }> = {
  primary: { bg: 'primary', border: 'primary', fg: 'onPrimary' },
  secondary: { bg: 'secondary', border: 'secondary', fg: 'onSecondary' },
  soft: { bg: 'primarySoft', border: 'primarySoft', fg: 'primary' },
  outline: { bg: 'surface', border: 'borderControl', fg: 'color' },
  onAccent: { bg: 'transparent', border: 'onPrimary', fg: 'onPrimary' },
  danger: { bg: 'surface', border: 'dangerText', fg: 'dangerText' },
  dangerSolid: { bg: 'dangerText', border: 'dangerText', fg: 'onPrimary' },
  warn: { bg: 'warnText', border: 'warnText', fg: 'onPrimary' },
  ghost: { bg: 'transparent', border: 'transparent', fg: 'primary' },
  glassGhost: { bg: 'transparent', border: 'transparent', fg: 'onGlass' },
};

const FILLED = new Set<ButtonVariant>(['primary', 'secondary', 'warn', 'dangerSolid']);

const BUTTON_SHADOW: Partial<Record<ButtonVariant, ShadowLevel>> = { primary: 'glow', secondary: 'sm', warn: 'sm', dangerSolid: 'sm' };

export function ActionButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  flex,
  size = 'md',
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  flex?: number;
  size?: 'sm' | 'md' | 'lg';
  accessibilityLabel?: string;
}) {
  const inactive = disabled || loading;
  const v = BUTTONS[variant];
  const ghostOrAccent = variant === 'ghost' || variant === 'onAccent' || variant === 'glassGhost';
  const bg = inactive && !ghostOrAccent ? 'subtle' : v.bg;
  const border = inactive && !ghostOrAccent ? 'subtle' : v.border;
  const fg = inactive ? (variant === 'onAccent' || variant === 'glassGhost' ? 'onGlassMuted' : 'colorMuted') : v.fg;
  return (
    <Button
      flex={flex}
      minH={size === 'lg' ? 52 : size === 'md' ? 48 : 40}
      px={size === 'sm' ? '3' : '4'}
      rounded={RADIUS.control}
      bg={bg as 'surface'}
      borderWidth={1}
      borderColor={border as 'borderColor'}
      style={!inactive && BUTTON_SHADOW[variant] ? elevated(BUTTON_SHADOW[variant]) : undefined}
      disabled={inactive}
      opacity={inactive && variant === 'onAccent' ? 0.7 : '1 press:0.85'}
      scale={inactive ? 1 : '1 press:0.985'}
      transition="fast"
      onPress={() => {
        if (FILLED.has(variant)) {
          haptic.tap();
        }
        onPress();
      }}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
    >
      {loading ? <Spinner color={fg as 'color'} /> : null}
      <Button.Text fontSize={size === 'sm' ? 14 : 15} fontWeight="600" color={fg as 'color'} numberOfLines={1}>
        {label}
      </Button.Text>
    </Button>
  );
}
