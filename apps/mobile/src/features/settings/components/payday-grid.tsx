import { Button, XStack, YStack } from 'tamagui';
import { haptic } from '@/ui/motion/haptics';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export function PaydayGrid({ value, onChange }: { value: number; onChange: (day: number) => void }) {
  return (
    <XStack flexWrap="wrap" py="1" mx={-3}>
      {DAYS.map((day) => (
        <YStack key={day} w="14.2857%" p={3}>
          <Button
            h={44}
            p="0"
            rounded="lg"
            bg={value === day ? 'primary' : 'surface'}
            borderWidth={1}
            borderColor={value === day ? 'primary' : 'borderControl'}
            scale="1 press:0.985"
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
