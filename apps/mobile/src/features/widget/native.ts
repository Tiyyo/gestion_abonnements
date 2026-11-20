import { requireOptionalNativeModule } from 'expo';

/** Pont vers le widget de l'écran d'accueil Android : écrit l'instantané et demande le redessin. */
export interface WidgetBridge {
  setSnapshot(json: string): void;
}

/** Module natif local `modules/sluis-widget` ; absent dans Expo Go et hors Android, où le pont ne fait rien. */
const nativeModule = requireOptionalNativeModule<WidgetBridge>('SluisWidget');

export const widgetBridge: WidgetBridge = nativeModule ?? { setSnapshot: () => undefined };
