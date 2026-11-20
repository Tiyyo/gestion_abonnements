import { XStack } from 'tamagui';
import type { Settings } from '@/db/types';
import { fundingLeadLabel, marginLabel, paydayLabel } from '@/features/settings/labels';
import type { ExpandedRows, SaveSetting } from '@/features/settings/types';
import { Chip } from '@/ui/controls/chip';
import { Section } from '@/ui/surfaces/section';
import { Caption } from '@/ui/text/typography';
import { Expandable } from './expandable';
import { MarginStepper } from './margin-stepper';
import { PaydayGrid } from './payday-grid';

const LEAD_DAYS = [1, 2, 3];

type TransferSectionProps = { settings: Settings; rows: ExpandedRows; save: SaveSetting; onHero: boolean };

export function TransferSection({ settings: s, rows, save, onHero }: TransferSectionProps) {
  return (
    <Section onHero={onHero} title="Virement et marge">
      <Expandable
        open={rows.expanded === 'payday'}
        onToggle={() => rows.toggle('payday')}
        label="Jour de paie"
        value={paydayLabel(s.payday_day)}
      >
        <PaydayGrid value={s.payday_day} onChange={(day) => save({ payday_day: day })} />
        <Caption>Un week-end ou un jour férié reporte le virement au jour ouvré suivant.</Caption>
      </Expandable>
      <Expandable
        open={rows.expanded === 'margin'}
        onToggle={() => rows.toggle('margin')}
        label={'Marge globale (max 5 %)'}
        value={marginLabel(s.global_margin_bp)}
      >
        <MarginStepper value={s.global_margin_bp} onChange={(bp) => save({ global_margin_bp: bp })} />
        <Caption>Les prélèvements déjà alimentés gardent leur montant.</Caption>
      </Expandable>
      <Expandable
        open={rows.expanded === 'lead'}
        onToggle={() => rows.toggle('lead')}
        label="Délai d’alimentation"
        value={fundingLeadLabel(s.funding_lead_days)}
        last
      >
        <XStack gap="2">
          {LEAD_DAYS.map((d) => (
            <Chip key={d} label={`J-${d}`} selected={s.funding_lead_days === d} onPress={() => save({ funding_lead_days: d })} />
          ))}
        </XStack>
      </Expandable>
    </Section>
  );
}
