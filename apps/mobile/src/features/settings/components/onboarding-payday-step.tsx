import { paydayLabel } from '@/features/settings/labels';
import { Body, Caption } from '@/ui/text/typography';
import { PaydayGrid } from './payday-grid';

export function OnboardingPaydayStep({ value, onChange }: { value: number; onChange: (day: number) => void }) {
  return (
    <>
      <Body>Le jour où ton salaire arrive. Chaque mois, l’app calcule ce qu’il faut mettre dans le coffre ce jour-là.</Body>
      <PaydayGrid value={value} onChange={onChange} />
      <Caption>{`Virement de paie ${paydayLabel(value)}, reporté au jour ouvré suivant si besoin.`}</Caption>
    </>
  );
}
