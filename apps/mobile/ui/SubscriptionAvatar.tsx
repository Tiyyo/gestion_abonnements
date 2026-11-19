import Svg, { Path } from 'react-native-svg';
import { Text, YStack } from 'tamagui';
import { BRAND_ICONS } from './brand-icons';

const PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['#E6EEFB', '#1F3B7A'],
  ['#E3F2FB', '#0F4C6E'],
  ['#E5F4EA', '#1E5B32'],
  ['#DFF2EF', '#0F5C55'],
  ['#EFE7FA', '#4C1E4F'],
  ['#ECEEF0', '#3B4650'],
];

const TEXT_COLOR = '#14181B';

function pairFor(name: string): readonly [string, string] {
  let hash = 0;
  for (const char of name.toLowerCase()) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return PAIRS[hash % PAIRS.length] ?? PAIRS[0]!;
}

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

export function logoColor(hex: string): string {
  const contrastOnWhite = 1.05 / (luminance(hex) + 0.05);
  return contrastOnWhite >= 3 ? `#${hex}` : TEXT_COLOR;
}

export function SubscriptionAvatar({ name, iconKey, size = 44 }: { name: string; iconKey?: string | null; size?: number }) {
  const brand = iconKey ? BRAND_ICONS[iconKey] : undefined;
  if (brand) {
    return (
      <YStack
        w={size}
        h={size}
        rounded="xl"
        items="center"
        justify="center"
        bg="surface"
        borderWidth={1}
        borderColor="borderColor"
        accessibilityElementsHidden
      >
        <Svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24">
          <Path d={brand.path} fill={logoColor(brand.hex)} />
        </Svg>
      </YStack>
    );
  }
  const [bg, fg] = name.trim() && name !== '?' ? pairFor(name) : (['#ECEEF0', '#3B4650'] as const);
  return (
    <YStack w={size} h={size} rounded="xl" items="center" justify="center" style={{ backgroundColor: bg }} accessibilityElementsHidden>
      <Text fontSize={size * 0.4} fontWeight="700" style={{ color: fg }}>
        {name.trim().charAt(0).toUpperCase()}
      </Text>
    </YStack>
  );
}
