import type { SettingsUpdate } from '@/db/types';

/** Ligne dépliée de l'écran Réglages (une seule à la fois). */
export type ExpandedRow = 'payday' | 'margin' | 'lead' | 'trial' | 'cancel' | null;

export type ExpandedRows = { expanded: ExpandedRow; toggle: (row: ExpandedRow) => void };

export type SaveSetting = (patch: SettingsUpdate) => void;
