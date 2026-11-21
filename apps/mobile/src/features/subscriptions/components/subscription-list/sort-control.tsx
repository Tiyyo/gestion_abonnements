import { ArrowUpDown, ChevronDown } from 'lucide-react-native';
import { useState } from 'react';
import { XStack } from 'tamagui';
import { SORT_OPTIONS, sortLabel, type SubscriptionSort } from '@/features/subscriptions/subscription-view';
import { useColors } from '@/theme/use-colors';
import { RADIUS } from '@/theme/elevation';
import { BottomSheet } from '@/ui/feedback/bottom-sheet';
import { SheetOption } from '@/ui/feedback/sheet-option';
import { haptic } from '@/ui/motion/haptics';
import { Caption, Label } from '@/ui/text/typography';

/** Puce « Trier par → valeur » qui ouvre le panneau de choix ; le tri s'applique à l'intérieur de chaque groupe. */
export function SortControl({ value, onChange }: { value: SubscriptionSort; onChange: (sort: SubscriptionSort) => void }) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const label = sortLabel(value);
  return (
    <>
      <XStack
        self="flex-start"
        minH={44}
        px="3"
        gap="2"
        items="center"
        rounded={RADIUS.pill}
        bg="surface"
        borderWidth={1}
        borderColor="borderControl"
        onPress={() => {
          haptic.select();
          setOpen(true);
        }}
        opacity="1 press:0.6"
        scale="1 press:0.985"
        transition="fast"
        accessibilityRole="button"
        accessibilityLabel={`Trier par : ${label}. Modifier`}
      >
        <ArrowUpDown color={colors.muted} size={16} />
        <Caption>Trier par</Caption>
        <Label numberOfLines={1}>{label}</Label>
        <ChevronDown color={colors.muted} size={16} />
      </XStack>
      <BottomSheet open={open} title="Trier par" onClose={() => setOpen(false)}>
        {SORT_OPTIONS.map((option, i) => (
          <SheetOption
            key={option.key}
            label={option.label}
            hint={option.hint}
            selected={option.key === value}
            last={i === SORT_OPTIONS.length - 1}
            onPress={() => {
              onChange(option.key);
              setOpen(false);
            }}
          />
        ))}
      </BottomSheet>
    </>
  );
}
