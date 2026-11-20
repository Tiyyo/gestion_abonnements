import { Minus, Percent, Plus } from 'lucide-react-native';
import { XStack, YStack } from 'tamagui';
import { formatPercentBp as marginLabel } from '@/lib/format';
import { ActionButton } from '@/ui/controls/action-button';
import { Amount, Body, Caption } from '@/ui/text/typography';
import { stepMargin } from './form-labels';
import { FormRow } from './form-row';
import { StepButton } from './step-button';

interface Props {
  overrideBp: number | null;
  globalMarginBp: number;
  onChange: (marginBp: number | null) => void;
}

/** Marge propre à l'abonnement, par pas de 0,5 % ; `null` revient à la marge globale. */
export function MarginRow({ overrideBp, globalMarginBp, onChange }: Props) {
  const effective = overrideBp ?? globalMarginBp;
  return (
    <FormRow icon={Percent}>
      <YStack flex={1} gap="0.5">
        <Body>Marge</Body>
        {overrideBp === null ? (
          <Caption>{`globale (${marginLabel(globalMarginBp)})`}</Caption>
        ) : (
          <XStack>
            <ActionButton
              size="sm"
              variant="ghost"
              label={`Revenir à la globale (${marginLabel(globalMarginBp)})`}
              onPress={() => onChange(null)}
            />
          </XStack>
        )}
      </YStack>
      <StepButton icon={Minus} label="Diminuer la marge" onPress={() => onChange(stepMargin(effective, -1))} />
      <Amount minW={56} text="center" fontWeight="700">
        {marginLabel(effective)}
      </Amount>
      <StepButton icon={Plus} label="Augmenter la marge" onPress={() => onChange(stepMargin(effective, 1))} />
    </FormRow>
  );
}
