import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold, useFonts } from '@expo-google-fonts/space-grotesk';
import { useEffect } from 'react';
import { useDbInit } from '@/db/provider';
import { attachNotificationDb } from '@/notifications/scheduler';
import { attachWidgetDb } from '@/features/widget/refresher';

/** Démarrage : ouverture de la base (branchée aux notifications et au widget dès qu'elle est prête) et chargement des polices. */
export function useAppBoot() {
  const db = useDbInit();
  const [fontsLoaded, fontError] = useFonts({ SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold });
  // Une police qui ne charge pas ne bloque pas l'app : le texte retombe sur la police système.
  const fontsSettled = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (db.status === 'ready') {
      attachNotificationDb(db.db);
      attachWidgetDb(db.db);
    }
  }, [db]);

  return { db, fontsSettled };
}
