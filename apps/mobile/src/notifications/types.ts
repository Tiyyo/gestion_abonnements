import type { NotificationKind } from '@/db/types';

export interface PlannedNotification {
  kind: NotificationKind;
  refId: string;
  /** Instant de déclenchement local, `YYYY-MM-DDTHH:mm`. */
  fireAt: string;
  title: string;
  body: string;
  url: string;
}

/** Date `YYYY-MM-DD` → instant de déclenchement à l'heure des rappels. */
export type FireAt = (date: string) => string;
