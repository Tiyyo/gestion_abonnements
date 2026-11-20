import type { NotificationKind } from '@/db/types';

export interface PlannedNotification {
  kind: NotificationKind;
  refId: string;
  /** Instant de déclenchement local, `YYYY-MM-DDTHH:mm`. */
  fireAt: string;
  title: string;
  body: string;
  url: string;
  /** Catégorie de notification (boutons d'action), s'il y en a une. */
  categoryId?: string;
  /** Données ajoutées à `data.url` dans la notification. */
  data?: Record<string, string>;
}

/** Date `YYYY-MM-DD` → instant de déclenchement à l'heure des rappels. */
export type FireAt = (date: string) => string;
