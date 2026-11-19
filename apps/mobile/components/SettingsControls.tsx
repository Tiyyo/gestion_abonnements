import { Minus, Plus } from 'lucide-react-native';
import { Button, XStack, YStack } from 'tamagui';
import { Chip } from '../ui/Chip';
import { formatPercentBp } from '../ui/format';
import { Amount, colors } from '../ui/kit';
import { haptic } from '../ui/motion';

export const marginLabel = formatPercentBp;

export function paydayLabel(day: number): string {
  return day === 1 ? 'le 1er du mois' : `le ${day} du mois`;
}

export function PaydayGrid({ value, onChange }: { value: number; onChange: (day: number) => void }) {
  return (
    <XStack flexWrap="wrap" py="1" mx={-3}>
      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
        <YStack key={day} w="14.2857%" p={3}>
          <Button
            h={44}
            p="0"
            rounded="lg"
            bg={value === day ? 'primary' : 'surface'}
            borderWidth={1}
            borderColor={value === day ? 'primary' : 'borderControl'}
            scale="1 press:0.96"
            transition="fast"
            onPress={() => {
              haptic.select();
              onChange(day);
            }}
            accessibilityLabel={`Jour ${day}`}
            accessibilityState={{ selected: value === day }}
          >
            <Button.Text color={value === day ? 'onPrimary' : 'color'} fontWeight="600" fontVariant={['tabular-nums']}>
              {String(day)}
            </Button.Text>
          </Button>
        </YStack>
      ))}
    </XStack>
  );
}

export function MarginStepper({ value, onChange }: { value: number; onChange: (bp: number) => void }) {
  return (
    <XStack gap="2" items="center">
      <Button
        w={44}
        h={44}
        p="0"
        bg="surface"
        borderWidth={1}
        borderColor="borderControl"
        disabled={value <= 0}
        scale="1 press:0.96"
        transition="fast"
        onPress={() => {
          haptic.select();
          onChange(Math.max(0, value - 50));
        }}
        accessibilityLabel="Diminuer la marge"
      >
        <Minus color={colors.text} size={20} />
      </Button>
      <Amount minW={72} text="center" fontSize={17} fontWeight="700">
        {marginLabel(value)}
      </Amount>
      <Button
        w={44}
        h={44}
        p="0"
        bg="surface"
        borderWidth={1}
        borderColor="borderControl"
        disabled={value >= 500}
        scale="1 press:0.96"
        transition="fast"
        onPress={() => {
          haptic.select();
          onChange(Math.min(500, value + 50));
        }}
        accessibilityLabel="Augmenter la marge"
      >
        <Plus color={colors.text} size={20} />
      </Button>
    </XStack>
  );
}

export function ReminderChips({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  return (
    <XStack gap="2" flexWrap="wrap">
      {[7, 3, 1].map((day) => {
        const selected = value.includes(day);
        return (
          <Chip
            key={day}
            label={`J-${day}`}
            selected={selected}
            onPress={() => onChange((selected ? value.filter((d) => d !== day) : [...value, day]).sort((a, b) => b - a))}
          />
        );
      })}
    </XStack>
  );
}

export function parseDays(json: string): number[] {
  try {
    const value = JSON.parse(json) as unknown;
    return Array.isArray(value) ? value.filter((n): n is number => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

export function reminderLabel(days: number[]): string {
  return days.length === 0 ? 'Aucun' : days.map((d) => `J-${d}`).join(' et ');
}
