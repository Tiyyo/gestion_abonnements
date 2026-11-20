import type { Category } from '@/db/types';
import { SheetOption } from '@/ui/feedback/sheet-option';

export function CategoryOptions({
  categories,
  selected,
  onSelect,
}: {
  categories: readonly Category[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return categories.map((c, i, all) => (
    <SheetOption key={c.id} label={c.name} selected={selected === c.id} last={i === all.length - 1} onPress={() => onSelect(c.id)} />
  ));
}
