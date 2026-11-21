import { Check } from 'lucide-react-native';
import { XStack } from 'tamagui';
import { AndroidSetting, EXACT_ALARM_RELEVANT, openAndroidSetting } from '@/features/settings/android-settings';
import { requestNotifications } from '@/notifications/permissions';
import { colors } from '@/theme/colors';
import { RADIUS } from '@/theme/elevation';
import { ActionButton } from '@/ui/controls/action-button';
import { Body, Caption, Label } from '@/ui/text/typography';

export type NotificationRequest = 'idle' | 'ok' | 'refused';

/** `notif` reste dans l'écran parent : revenir en arrière puis revenir ici garde la réponse. */
export function OnboardingRemindersStep({
  notif,
  setNotif,
}: {
  notif: NotificationRequest;
  setNotif: (value: NotificationRequest) => void;
}) {
  return (
    <>
      <Body color="onGlass">
        L’app te rappelle quand faire un transfert, quand un essai se termine et quand résilier. Les rappels restent sur le téléphone.
      </Body>
      {notif === 'ok' ? (
        <XStack
          minH={56}
          items="center"
          justify="center"
          gap="2"
          px="4"
          bg="glassInner"
          borderWidth={1}
          borderColor="glassEdge"
          rounded={RADIUS.pill}
        >
          <Check color={colors.onGlassOk} size={18} strokeWidth={2.5} />
          <Label color="onGlassOk">Notifications autorisées</Label>
        </XStack>
      ) : (
        <ActionButton
          size="lg"
          label="Autoriser les notifications"
          variant="glass"
          onPress={() => requestNotifications().then((ok) => setNotif(ok ? 'ok' : 'refused'))}
        />
      )}
      {notif === 'refused' && <Body color="onGlassWarn">Refusé : tu pourras les autoriser plus tard dans les Réglages.</Body>}
      {EXACT_ALARM_RELEVANT && (
        <ActionButton
          label="Autoriser les alarmes exactes"
          variant="glassGhost"
          onPress={() => openAndroidSetting(AndroidSetting.REQUEST_SCHEDULE_EXACT_ALARM, true)}
        />
      )}
      <ActionButton
        label="Régler l’économie de batterie"
        variant="glassGhost"
        onPress={() => openAndroidSetting(AndroidSetting.IGNORE_BATTERY_OPTIMIZATION_SETTINGS)}
      />
      <Caption color="onGlassMuted">
        Sur Xiaomi, autorise aussi le démarrage automatique de l’app, sinon les rappels peuvent être bloqués.
      </Caption>
    </>
  );
}
