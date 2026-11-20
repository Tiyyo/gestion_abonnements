import { formatEuros } from '@abonnements/core';
import { router } from 'expo-router';
import { CalendarDays, ChevronLeft, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Button, Spinner, styled, Text, XStack, YStack, type YStackProps } from 'tamagui';
import config from '../tamagui.config';
import { elevated, RADIUS, type ShadowLevel } from './elevation';
import { haptic } from './motion';

const palette = config.themes.light;
export const colors = {
  text: String(palette.color?.val ?? '#14181B'),
  muted: String(palette.colorMuted?.val ?? '#5B6670'),
  primary: String(palette.primary?.val ?? '#4C1E4F'),
  onPrimary: String(palette.onPrimary?.val ?? '#FFFFFF'),
  ok: String(palette.okText?.val ?? '#214F1E'),
  border: String(palette.borderColor?.val ?? '#E3E6E3'),
  danger: String(palette.dangerText?.val ?? '#8A1C1C'),
  warn: String(palette.warnText?.val ?? '#7A3E00'),
  background: String(palette.background?.val ?? '#F5F6F4'),
  surface: String(palette.surface?.val ?? '#FFFFFF'),
  borderControl: String(palette.borderControl?.val ?? '#838C94'),
  scrim: String(palette.scrim?.val ?? 'rgba(20, 24, 27, 0.5)'),
  onGlass: String(palette.onGlass?.val ?? '#FFFFFF'),
  onGlassMuted: String(palette.onGlassMuted?.val ?? 'rgba(255, 255, 255, 0.72)'),
  onGlassOk: String(palette.onGlassOk?.val ?? '#CDEFD6'),
  onGlassWarn: String(palette.onGlassWarn?.val ?? '#FFD9A8'),
  onGlassDanger: String(palette.onGlassDanger?.val ?? '#FFC9C9'),
  heroFrom: String(palette.heroFrom?.val ?? '#3A143D'),
  heroTo: String(palette.heroTo?.val ?? '#1E0A20'),
  heroGlowWarm: String(palette.heroGlowWarm?.val ?? '#F6D5C4'),
  heroGlowCool: String(palette.heroGlowCool?.val ?? '#9C48A0'),
};

const TABULAR = ['tabular-nums'] as const;

export const Overline = styled(Text, {
  fontSize: 12,
  fontWeight: '700',
  letterSpacing: 0.6,
  textTransform: 'uppercase',
  color: 'colorMuted',
});

// Space Grotesk pour les titres d'écran et les grands montants (chargée dans app/_layout.tsx).
// La graisse est dans le nom de la police : pas de fontWeight, sinon Android ajoute un gras synthétique.
export const DISPLAY_FONT = 'SpaceGrotesk_700Bold';

export const ScreenTitle = styled(Text, {
  fontSize: 28,
  fontFamily: DISPLAY_FONT as never,
  letterSpacing: -0.5,
  color: 'color',
});

export const Heading = styled(Text, {
  fontSize: 20,
  fontWeight: '700',
  letterSpacing: -0.2,
  color: 'color',
});

export const CardTitle = styled(Text, {
  fontSize: 17,
  fontWeight: '600',
  color: 'color',
});

export const Body = styled(Text, {
  fontSize: 15,
  color: 'color',
});

export const Label = styled(Text, {
  fontSize: 15,
  fontWeight: '600',
  color: 'color',
});

export const Caption = styled(Text, {
  fontSize: 13,
  color: 'colorMuted',
});

export const Amount = styled(Text, {
  fontSize: 15,
  fontWeight: '600',
  color: 'color',
  fontVariant: TABULAR as unknown as never,
});

export const Display = styled(Text, {
  fontSize: 36,
  fontFamily: DISPLAY_FONT as never,
  letterSpacing: -1,
  color: 'color',
  fontVariant: TABULAR as unknown as never,
});

/** Grand montant en verre : euros en blanc, « ,27 € » plus petit et atténué. */
export function HeroAmount({ cents }: { cents: number | null }) {
  if (cents === null) {
    return <Display color="onGlassMuted">—</Display>;
  }
  const text = formatEuros(cents);
  const comma = text.lastIndexOf(',');
  return (
    <Display color="onGlass" accessibilityLabel={text}>
      {text.slice(0, comma)}
      <Display fontSize={22} color="onGlassMuted">
        {text.slice(comma)}
      </Display>
    </Display>
  );
}

export type Tone = 'plain' | 'accent' | 'warn' | 'danger' | 'ok';

// L'élévation passe par l'ombre (teintée selon le ton), plus par la bordure.
const TONES: Record<Tone, { bg: string; shadow: ShadowLevel }> = {
  plain: { bg: 'surface', shadow: 'md' },
  accent: { bg: 'primary', shadow: 'accent' },
  warn: { bg: 'warnBg', shadow: 'warn' },
  danger: { bg: 'dangerBg', shadow: 'danger' },
  ok: { bg: 'okBg', shadow: 'ok' },
};

export function Card({ tone = 'plain', lift, children, style, ...props }: YStackProps & { tone?: Tone; lift?: boolean }) {
  const t = TONES[tone];
  return (
    <YStack
      bg={t.bg as 'surface'}
      borderWidth={1}
      borderColor="transparent"
      rounded={RADIUS.card}
      p="4"
      gap="2"
      style={[elevated(lift && tone === 'plain' ? 'lg' : t.shadow), style]}
      {...props}
    >
      {children}
    </YStack>
  );
}

export function ListCard({ children, onPress, accessibilityLabel, ...props }: YStackProps & { onPress?: () => void }) {
  return (
    <XStack
      bg="surface"
      borderWidth={1}
      borderColor="transparent"
      rounded={RADIUS.row}
      px="3"
      py="3"
      gap="3"
      items="center"
      minH={64}
      style={elevated('md')}
      onPress={onPress}
      opacity={onPress ? '1 press:0.85' : undefined}
      scale={onPress ? '1 press:0.985' : undefined}
      transition="fast"
      accessibilityRole={onPress ? 'button' : undefined}
      accessible={onPress ? true : undefined}
      accessibilityLabel={accessibilityLabel}
      {...(props as object)}
    >
      {children}
    </XStack>
  );
}

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

export function IconButton({
  icon: Icon,
  label,
  onPress,
  variant = 'surface',
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  variant?: 'surface' | 'primary' | 'ghost' | 'glass';
}) {
  const primary = variant === 'primary';
  const glass = variant === 'glass';
  return (
    <Button
      w={48}
      h={48}
      p="0"
      rounded={RADIUS.control}
      bg={primary ? 'primary' : glass ? 'glassFill' : variant === 'ghost' ? 'transparent' : 'surface'}
      borderWidth={1}
      borderColor={glass ? 'glassEdge' : 'transparent'}
      style={primary ? elevated('glow') : variant === 'surface' ? elevated('sm') : undefined}
      opacity="1 press:0.75"
      scale="1 press:0.985"
      transition="fast"
      onPress={onPress}
      accessibilityLabel={label}
    >
      <Icon color={primary || glass ? colors.onPrimary : colors.text} size={22} strokeWidth={2} />
    </Button>
  );
}

export function ScreenHeader({
  overline,
  title,
  trailing,
  onHero,
}: {
  overline?: string;
  title: string;
  trailing?: ReactNode;
  onHero?: boolean;
}) {
  return (
    <XStack px="4" items="flex-end" justify="space-between" gap="3">
      <YStack shrink={1} gap="0.5">
        {overline ? <Overline color={onHero ? 'onGlassMuted' : 'colorMuted'}>{overline}</Overline> : null}
        <ScreenTitle numberOfLines={2} color={onHero ? 'onGlass' : 'color'}>
          {title}
        </ScreenTitle>
      </YStack>
      {trailing ? (
        <XStack gap="2" items="center">
          {trailing}
        </XStack>
      ) : null}
    </XStack>
  );
}

export function StackHeader({
  title,
  trailing,
  onBack,
  onHero,
}: {
  title?: string;
  trailing?: ReactNode;
  onBack?: () => void;
  onHero?: boolean;
}) {
  return (
    <XStack px="2" minH={52} items="center" gap="2">
      <IconButton icon={ChevronLeft} label="Retour" variant={onHero ? 'glass' : 'ghost'} onPress={onBack ?? (() => router.back())} />
      <YStack flex={1}>
        {title ? (
          <Heading numberOfLines={1} fontSize={22} color={onHero ? 'onGlass' : 'color'}>
            {title}
          </Heading>
        ) : null}
      </YStack>
      {trailing}
    </XStack>
  );
}

export function SectionTitle({ children, action }: { children: string; action?: ReactNode }) {
  return (
    <XStack mt="3" minH={44} items="center" justify="space-between" gap="3">
      <Heading shrink={1}>{children}</Heading>
      {action}
    </XStack>
  );
}

export function KeyValue({ label, value, last, children }: { label: string; value?: string; last?: boolean; children?: ReactNode }) {
  return (
    <XStack py="3" minH={52} gap="4" items="center" justify="space-between" borderBottomWidth={last ? 0 : 1} borderColor="borderColor">
      <Body color="colorMuted" shrink={1}>
        {label}
      </Body>
      {children ?? (
        <Amount text="right" shrink={1}>
          {value}
        </Amount>
      )}
    </XStack>
  );
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <YStack px="6" mt="10" gap="4" items="center">
      <Body color="colorMuted" text="center">
        {message}
      </Body>
      {action}
    </YStack>
  );
}

export const SCREEN_PADDING = 16;
export const TOP_GAP = { tab: 32, stack: 20 } as const;

export function DateField({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel?: string }) {
  return (
    <Button
      minH={48}
      rounded={RADIUS.control}
      justify="flex-start"
      gap="2"
      bg="surface"
      borderWidth={1}
      borderColor="borderControl"
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? `Date : ${label}. Modifier`}
    >
      <CalendarDays color={colors.muted} size={20} />
      <Button.Text fontSize={16} color="color">
        {label}
      </Button.Text>
    </Button>
  );
}

export function ModalHeader({ title, onCancel }: { title?: string; onCancel?: () => void }) {
  return (
    <XStack px="2" minH={52} items="center" gap="1">
      <ActionButton label="Annuler" variant="ghost" onPress={onCancel ?? (() => router.back())} />
      {title ? (
        <Heading flex={1} fontSize={22} numberOfLines={1}>
          {title}
        </Heading>
      ) : null}
    </XStack>
  );
}

export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <XStack p="4" gap="3" borderTopWidth={1} borderColor="borderColor" bg="surface">
      {children}
    </XStack>
  );
}
