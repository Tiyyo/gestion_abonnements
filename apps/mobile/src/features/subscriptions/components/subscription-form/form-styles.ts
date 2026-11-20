import { StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { DISPLAY_FONT } from '@/ui/text/typography';

export const formStyles = StyleSheet.create({
  badge: { position: 'absolute', right: -6, bottom: -6 },
  name: { fontSize: 17, fontWeight: '700', color: colors.onGlass, padding: 0 },
  amount: { fontSize: 26, fontFamily: DISPLAY_FONT, color: colors.onGlass, padding: 0, minWidth: 56, fontVariant: ['tabular-nums'] },
  currency: { fontSize: 20, fontFamily: DISPLAY_FONT },
  inline: { fontSize: 16, color: colors.text, padding: 0 },
  notes: { minHeight: 48, textAlignVertical: 'top' },
});
