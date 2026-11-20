import { Linking } from 'react-native';
import { ActionButton } from '@/ui/controls/action-button';

export function CancelLink({ url }: { url: string }) {
  return (
    <ActionButton
      label="Ouvrir"
      variant="ghost"
      size="sm"
      accessibilityLabel="Ouvrir le lien de résiliation"
      onPress={() => Linking.openURL(url)}
    />
  );
}
