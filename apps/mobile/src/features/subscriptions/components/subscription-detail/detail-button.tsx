import { ActionButton } from '@/ui/controls/action-button';

const TONE_VARIANT = { primary: 'primary', danger: 'danger', neutral: 'outline' } as const;

interface Props {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'danger' | 'neutral';
  disabled?: boolean;
}

export function DetailButton({ label, onPress, tone = 'primary', disabled }: Props) {
  return <ActionButton flex={1} size="lg" label={label} variant={TONE_VARIANT[tone]} disabled={disabled} onPress={onPress} />;
}
