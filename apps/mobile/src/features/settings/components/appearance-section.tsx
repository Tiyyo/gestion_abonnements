import { SunMoon } from 'lucide-react-native';
import { useState } from 'react';
import type { ThemeMode } from '@/db/types';
import { THEME_MODES, themeModeLabel } from '@/features/settings/labels';
import type { SaveSetting } from '@/features/settings/types';
import { PickerRow } from '@/ui/controls/picker-row';
import { BottomSheet } from '@/ui/feedback/bottom-sheet';
import { SheetOption } from '@/ui/feedback/sheet-option';
import { Section } from '@/ui/surfaces/section';

/** Thème de l'app : celui du téléphone par défaut, ou clair / sombre forcé. */
export function AppearanceSection({ mode, save }: { mode: ThemeMode; save: SaveSetting }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Section title="Affichage">
      <PickerRow icon={SunMoon} label="Apparence" value={themeModeLabel(mode)} onPress={() => setOpen(true)} last />
      <BottomSheet open={open} title="Apparence" onClose={close}>
        {THEME_MODES.map((option, index) => (
          <SheetOption
            key={option.key}
            label={option.label}
            hint={option.hint}
            selected={option.key === mode}
            last={index === THEME_MODES.length - 1}
            onPress={() => {
              close();
              if (option.key !== mode) {
                save({ theme_mode: option.key });
              }
            }}
          />
        ))}
      </BottomSheet>
    </Section>
  );
}
