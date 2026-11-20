import { Search, X } from 'lucide-react-native';
import { StyleSheet } from 'react-native';
import { XStack } from 'tamagui';
import { colors } from '@/theme/colors';
import { RADIUS } from '@/theme/elevation';
import { GlassTextInput } from './glass-text-input';

interface Props {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  clearLabel?: string;
}

/** Champ de recherche en verre, à poser sur le dégradé du Hero : loupe, saisie, bouton d'effacement dès qu'il y a du texte. */
export function GlassSearchField({ value, onChangeText, placeholder, clearLabel = 'Effacer la recherche' }: Props) {
  return (
    <XStack h={44} pl={14} gap="2" items="center" rounded={RADIUS.pill} bg="glassFill" borderWidth={1} borderColor="glassEdge">
      <Search color={colors.onGlassMuted} size={18} />
      <GlassTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={styles.input}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={placeholder}
      />
      {value.length > 0 ? (
        <XStack
          w={44}
          h={44}
          items="center"
          justify="center"
          onPress={() => onChangeText('')}
          opacity="1 press:0.6"
          transition="fast"
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
        >
          <X color={colors.onGlass} size={18} />
        </XStack>
      ) : (
        <XStack w={6} />
      )}
    </XStack>
  );
}

const styles = StyleSheet.create({
  input: { flex: 1, height: 44, fontSize: 16, fontWeight: '500' },
});
