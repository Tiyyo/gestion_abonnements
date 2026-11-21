import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack } from 'tamagui';
import { ActionButton } from '@/ui/controls/action-button';

interface SecondaryAction {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

interface Props {
  busy: boolean;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Seconde réponse, en contour à gauche du bouton plein ; les libellés restent alors tels quels pendant l'enregistrement. */
  secondary?: SecondaryAction;
  /** Sélecteur de test du bouton plein (son libellé change pendant l'enregistrement). */
  testID?: string;
}

export function SheetFooter({ busy, label, onPress, disabled, secondary, testID }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <XStack p="4" pb={insets.bottom + 16} gap="3" borderTopWidth={1} borderColor="borderColor" bg="surface">
      {secondary ? (
        <ActionButton
          flex={1}
          size="lg"
          variant="outline"
          label={secondary.label}
          disabled={busy || secondary.disabled}
          onPress={secondary.onPress}
          testID={secondary.testID}
        />
      ) : null}
      <ActionButton
        flex={1}
        size="lg"
        label={busy && !secondary ? 'Enregistrement…' : label}
        loading={busy}
        disabled={disabled}
        onPress={onPress}
        testID={testID}
      />
    </XStack>
  );
}
