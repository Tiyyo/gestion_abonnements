import { Button, XStack } from 'tamagui';
import { elevated, RADIUS } from '@/theme/elevation';
import { Body } from '@/ui/text/typography';
import type { Toast } from './toast-logic';

/**
 * Surface du message : verre sombre aubergine, comme les cartes posées sur le dégradé.
 * Texte blanc sur `heroFrom` (#3A143D) : contraste 15:1 ; environ 11:1 sur le fond du bouton.
 */
export function ToastView({ toast, onAction }: { toast: Toast; onAction: () => void }) {
  const { action } = toast;
  return (
    <XStack
      bg="heroFrom"
      borderWidth={1}
      borderColor="glassEdge"
      rounded={RADIUS.glass}
      style={elevated('glass')}
      minH={56}
      pl="4"
      pr={action ? '1.5' : '4'}
      py="1.5"
      gap="3"
      items="center"
    >
      <XStack flex={1} py="2" accessible accessibilityLiveRegion="polite" accessibilityRole="alert">
        <Body color="onGlass" flex={1}>
          {toast.message}
        </Body>
      </XStack>
      {action ? (
        <Button
          minH={44}
          px="4"
          rounded={RADIUS.pill}
          bg="glassFill"
          borderWidth={1}
          borderColor="glassEdge"
          opacity="1 press:0.85"
          scale="1 press:0.985"
          transition="fast"
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          accessibilityHint={toast.message}
        >
          <Button.Text fontSize={15} fontWeight="600" color="onGlass" numberOfLines={1}>
            {action.label}
          </Button.Text>
        </Button>
      ) : null}
    </XStack>
  );
}
