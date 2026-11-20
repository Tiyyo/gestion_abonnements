import { formatEuros } from '@abonnements/core';
import * as Clipboard from 'expo-clipboard';
import * as IntentLauncher from 'expo-intent-launcher';
import { Linking } from 'react-native';
import { showError } from '@/ui/feedback/show-dialog';
import { haptic } from '@/ui/motion/haptics';
import { clipboardAmount } from './clipboard-amount';

const REVOLUT_PACKAGE = 'com.revolut.revolut';
const REVOLUT_URL = 'revolut://app';
const STORE_URLS = [`market://details?id=${REVOLUT_PACKAGE}`, `https://play.google.com/store/apps/details?id=${REVOLUT_PACKAGE}`];

/**
 * Ouvre Revolut : par son paquet (demande l'entrée `<queries>` de `plugins/with-revolut-queries.js`, donc un APK
 * reconstruit), à défaut par son lien `revolut://`, à défaut sa fiche Play Store.
 */
async function openRevolut(): Promise<void> {
  try {
    IntentLauncher.openApplication(REVOLUT_PACKAGE);
    return;
  } catch {
    // Paquet invisible (Expo Go, APK sans `<queries>`) ou app absente : on essaie le lien.
  }
  for (const url of [REVOLUT_URL, ...STORE_URLS]) {
    try {
      await Linking.openURL(url);
      return;
    } catch {
      // Aucune app ne prend ce lien : on passe au suivant.
    }
  }
  throw new Error('Revolut introuvable');
}

/** Raccourci d'un transfert : copie son montant (« 8,03 ») puis ouvre Revolut, où il ne reste qu'à le coller. */
export async function copyAmountAndOpenRevolut(amountCents: number): Promise<void> {
  try {
    await Clipboard.setStringAsync(clipboardAmount(amountCents));
  } catch {
    showError('Copie impossible', 'Le montant n’a pas pu être copié dans le presse-papiers.');
    return;
  }
  haptic.select();
  try {
    await openRevolut();
  } catch {
    showError('Revolut ne s’ouvre pas', `Le montant (${formatEuros(amountCents)}) est copié : ouvre Revolut à la main et colle-le.`);
  }
}
