import { Spinner, Text, YStack } from 'tamagui';

/** Écran d'attente du démarrage, ou erreur si la base n'a pas pu s'ouvrir. */
export function BootScreen({ error }: { error: Error | null }) {
  return (
    <YStack flex={1} items="center" justify="center" backgroundColor="background" gap="4">
      {error ? <Text color="dangerText">Base de données indisponible : {error.message}</Text> : <Spinner size="large" color="primary" />}
    </YStack>
  );
}
