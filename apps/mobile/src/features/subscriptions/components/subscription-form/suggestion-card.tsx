import { Sparkles } from 'lucide-react-native';
import { XStack, YStack } from 'tamagui';
import type { Suggestion } from '@/features/enrich/suggestion';
import { SubscriptionAvatar } from '@/features/subscriptions/components/subscription-avatar';
import { colors } from '@/theme/colors';
import { ActionButton } from '@/ui/controls/action-button';
import { Reveal } from '@/ui/motion/reveal';
import { Card } from '@/ui/surfaces/card';
import { Caption, Label, Overline } from '@/ui/text/typography';
import { SOURCE_LABELS, suggestionSummary } from './form-labels';

interface Props {
  suggestion: Suggestion;
  name: string;
  categoryName: string | undefined;
  onIgnore: () => void;
  onApply: () => void;
}

export function SuggestionCard({ suggestion, name, categoryName, onIgnore, onApply }: Props) {
  return (
    <Reveal>
      <Card gap="3" borderColor="primary">
        <XStack gap="2" items="center">
          <Sparkles color={colors.primary} size={16} />
          <Overline color="primary">{SOURCE_LABELS[suggestion.source]}</Overline>
        </XStack>
        <XStack gap="3" items="center">
          <SubscriptionAvatar name={name} iconKey={suggestion.iconKey} />
          <YStack flex={1} gap="0.5">
            <Label>{categoryName ?? 'Autre'}</Label>
            <Caption>{suggestionSummary(suggestion)}</Caption>
          </YStack>
        </XStack>
        <XStack gap="3">
          <ActionButton flex={1} label="Ignorer" variant="outline" onPress={onIgnore} />
          <ActionButton flex={1} label="Appliquer" variant="soft" onPress={onApply} />
        </XStack>
      </Card>
    </Reveal>
  );
}
