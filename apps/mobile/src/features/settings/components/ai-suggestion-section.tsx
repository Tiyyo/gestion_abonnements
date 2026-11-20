import type { SaveSetting } from '@/features/settings/types';
import { Toggle } from '@/ui/controls/toggle';
import { Section } from '@/ui/surfaces/section';
import { SettingRow } from '@/ui/surfaces/setting-row';

export function AiSuggestionSection({ enrichIncluded, aiOn, save }: { enrichIncluded: boolean; aiOn: boolean; save: SaveSetting }) {
  return (
    <Section title="Suggestion IA">
      <SettingRow
        label="Suggérer catégorie, logo et lien de résiliation"
        hint={
          enrichIncluded
            ? 'À partir du nom saisi. Seul le nom est envoyé. Coupée : seule la liste des marques connues sert.'
            : 'Service non inclus dans cette version : la suggestion vient de la liste des marques connues.'
        }
        last
      >
        <Toggle
          label="Suggestion IA"
          value={aiOn}
          disabled={!enrichIncluded}
          onChange={(on) => save({ ai_suggestion_enabled: on ? 1 : 0 })}
        />
      </SettingRow>
    </Section>
  );
}
