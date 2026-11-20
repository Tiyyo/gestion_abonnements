import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { colors } from '@/theme/colors';

/** Champ texte posé sur une carte en verre : texte blanc, sans cadre (la carte fait office de champ). */
export function GlassTextInput({ style, ...props }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.onGlassMuted}
      cursorColor={colors.onGlass}
      selectionColor={colors.onGlassMuted}
      style={[styles.text, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 17, fontWeight: '700', color: colors.onGlass, padding: 0 },
});
