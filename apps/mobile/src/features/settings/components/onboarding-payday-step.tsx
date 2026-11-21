import { paydayLabel } from '@/features/settings/labels';
import { Body, Caption } from '@/ui/text/typography';
import { PaydayGrid } from './payday-grid';

export function OnboardingPaydayStep({ value, onChange }: { value: number; onChange: (day: number) => void }) {
  return (
    <>
      <Body color="onGlass">Le jour où ton salaire arrive. Chaque mois, l’app calcule ce qu’il faut mettre dans le coffre ce jour-là.</Body>
      <PaydayGrid onGlass value={value} onChange={onChange} />
      <Caption color="onGlassMuted">{`Virement de paie ${paydayLabel(value)}, reporté au jour ouvré suivant si besoin.`}</Caption>
    </>
  );
}
