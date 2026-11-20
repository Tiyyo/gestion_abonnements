import { ActionButton } from '@/ui/controls/action-button';

export function SmallButton({ label, onPress, tone = 'outline' }: { label: string; onPress: () => void; tone?: 'outline' | 'strong' }) {
  return <ActionButton label={label} size="sm" variant={tone === 'strong' ? 'warn' : 'outline'} onPress={onPress} />;
}
