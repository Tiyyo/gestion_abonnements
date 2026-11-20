import { XStack } from 'tamagui';
import { AndroidSetting, openAndroidSetting } from '@/features/settings/android-settings';
import { Body, Caption, Overline } from '@/ui/text/typography';
import { Card } from '@/ui/surfaces/card';
import { SmallButton } from './small-button';

export function BatteryOptimizationCard() {
  return (
    <Card tone="warn" gap="2">
      <Overline color="warnText">Optimisation de la batterie</Overline>
      <Body color="warnText">Elle est active pour l’app : les rappels de transfert peuvent ne pas arriver.</Body>
      <Caption color="warnText">Sur Xiaomi, autorise aussi le démarrage automatique dans les paramètres de l’app.</Caption>
      <XStack mt="1">
        <SmallButton
          label="Corriger le réglage"
          tone="strong"
          onPress={() => openAndroidSetting(AndroidSetting.IGNORE_BATTERY_OPTIMIZATION_SETTINGS)}
        />
      </XStack>
    </Card>
  );
}
