import { StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';

export const formStyles = StyleSheet.create({
  badge: { position: 'absolute', right: -6, bottom: -6 },
  inline: { fontSize: 16, color: colors.text, padding: 0 },
  notes: { minHeight: 48, textAlignVertical: 'top' },
});
