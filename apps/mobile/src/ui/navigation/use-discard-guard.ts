import { router, usePreventRemove } from 'expo-router';
import { useRef, useState } from 'react';
import { Keyboard } from 'react-native';
import { showDialog } from '@/ui/feedback/show-dialog';

const DEFAULT_LOSS = 'Ce que tu as saisi ne sera pas enregistré.';

/**
 * Garde d'une saisie en cours : tant que `dirty` est vrai, toute sortie de l'écran (bouton ou geste retour d'Android,
 * « Annuler », `router.back()`, `router.replace()`) est retenue et demande confirmation. Sans saisie, rien n'est demandé.
 *
 * Après un enregistrement réussi, sortir par `leave()` (ou `release()` puis la navigation voulue) : la garde est levée
 * d'abord, sinon la question serait posée sur une saisie déjà enregistrée.
 *
 * Repose sur `usePreventRemove` d'expo-router 58 (l'évènement `beforeRemove` de React Navigation n'existe plus dans la
 * navigation embarquée) : le réducteur de navigation refuse l'action et émet `removePrevented`.
 */
export function useDiscardGuard(dirty: boolean, loss: string = DEFAULT_LOSS) {
  const [released, setReleased] = useState(false);
  const asking = useRef(false);

  const disablePrevention = usePreventRemove(dirty && !released, ({ repeat }) => {
    // Un seul dialogue, même si le retour est pressé plusieurs fois.
    if (asking.current) {
      return;
    }
    asking.current = true;
    Keyboard.dismiss();
    showDialog(
      'Abandonner la saisie ?',
      loss,
      [
        {
          text: 'Continuer la saisie',
          style: 'cancel',
          onPress: () => {
            asking.current = false;
          },
        },
        {
          text: 'Abandonner',
          style: 'destructive',
          onPress: () => {
            asking.current = false;
            setReleased(true);
            repeat();
          },
        },
      ],
      { tone: 'warn' },
    );
  });

  const release = () => {
    setReleased(true);
    disablePrevention();
  };
  const leave = () => {
    release();
    router.back();
  };

  return { release, leave };
}

export type DiscardGuard = ReturnType<typeof useDiscardGuard>;
