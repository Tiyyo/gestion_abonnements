import { Body } from '@/ui/text/typography';
import { MarginStepper } from './margin-stepper';

export function OnboardingMarginStep({ value, onChange }: { value: number; onChange: (bp: number) => void }) {
  return (
    <>
      <Body>
        {
          'Chaque prélèvement est alimenté avec un peu plus que son montant, pour absorber une petite hausse de prix. 3 % suffit en général, 5 % au maximum.'
        }
      </Body>
      <MarginStepper value={value} onChange={onChange} />
    </>
  );
}
