import { useState } from 'react';
import type { ExpandedRow, ExpandedRows } from '@/features/settings/types';

/** Une seule ligne dépliée à la fois : rouvrir la ligne ouverte la replie. */
export function useExpandedRow(): ExpandedRows {
  const [expanded, setExpanded] = useState<ExpandedRow>(null);
  const toggle = (row: ExpandedRow) => setExpanded((current) => (current === row ? null : row));
  return { expanded, toggle };
}
