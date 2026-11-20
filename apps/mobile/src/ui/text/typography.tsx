import { styled, Text } from 'tamagui';

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
