import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { Text, XStack } from 'tamagui';
import { useColors } from '@/theme/use-colors';
import { DISPLAY_FONT } from '@/ui/text/typography';

type Props = Pick<TextInputProps, 'value' | 'onChangeText' | 'onBlur' | 'accessibilityLabel' | 'testID'>;

/** Montant en euros sur une carte en verre, en Space Grotesk ; le « € » s'éclaire dès qu'un montant est saisi. */
export function GlassAmountInput({ value, ...props }: Props) {
  const colors = useColors();
  return (
    <XStack items="baseline" gap="1">
      <TextInput
        value={value}
        placeholder="0,00"
        placeholderTextColor={colors.onGlassMuted}
        cursorColor={colors.onGlass}
        selectionColor={colors.onGlassMuted}
        keyboardType="decimal-pad"
        textAlign="right"
        style={[styles.amount, { color: colors.onGlass }]}
        {...props}
      />
      {/* Le champ annonce déjà « en euros » : le symbole seul serait un arrêt de plus pour TalkBack. */}
      <Text style={styles.currency} color={value ? 'onGlass' : 'onGlassMuted'} importantForAccessibility="no" accessibilityElementsHidden>
        €
      </Text>
    </XStack>
  );
}

const styles = StyleSheet.create({
  amount: { fontSize: 26, fontFamily: DISPLAY_FONT, padding: 0, minWidth: 56, fontVariant: ['tabular-nums'] },
  currency: { fontSize: 20, fontFamily: DISPLAY_FONT },
});
