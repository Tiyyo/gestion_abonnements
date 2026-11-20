import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { useColors } from '@/theme/use-colors';

/** Champ texte posé sur une carte en verre : texte blanc, sans cadre (la carte fait office de champ). */
export function GlassTextInput({ style, ...props }: TextInputProps) {
  const colors = useColors();
  return (
    <TextInput
      placeholderTextColor={colors.onGlassMuted}
      cursorColor={colors.onGlass}
      selectionColor={colors.onGlassMuted}
      style={[styles.text, { color: colors.onGlass }, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 17, fontWeight: '700', padding: 0 },
});
