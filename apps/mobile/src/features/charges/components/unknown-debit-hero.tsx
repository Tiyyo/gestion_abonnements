import { ReceiptEuro } from 'lucide-react-native';
import { YStack } from 'tamagui';
import type { UnknownDebitForm } from '@/features/charges/hooks/use-unknown-debit-form';
import { colors } from '@/theme/colors';
import { GlassAmountInput } from '@/ui/controls/glass-amount-input';
import { GlassTextInput } from '@/ui/controls/glass-text-input';
import { GlassCard } from '@/ui/surfaces/glass-card';
import { Hero } from '@/ui/surfaces/hero';
import { Caption } from '@/ui/text/typography';

/** Aperçu du débit sur le dégradé, comme le formulaire d'abonnement : marchand à gauche, montant à droite. */
export function UnknownDebitHero({ form }: { form: UnknownDebitForm }) {
  return (
    <Hero px="4" pt="2" pb="5" gap="3">
      <Caption color="onGlassMuted" px="1">
        Un débit vu sur ton relevé Revolut que Sluis n’attendait pas.
      </Caption>
      <GlassCard flexDirection="row" items="center" gap="3" p="3.5">
        <YStack w={52} h={52} rounded="full" items="center" justify="center" bg="glassInner" borderWidth={1} borderColor="glassEdge">
          <ReceiptEuro color={colors.onGlass} size={24} />
        </YStack>
        <YStack flex={1} minW={0}>
          <GlassTextInput
            value={form.name}
            onChangeText={form.setName}
            placeholder="Marchand"
            autoCapitalize="words"
            returnKeyType="next"
            accessibilityLabel="Nom du marchand"
            testID="unknown-debit.name"
          />
          <Caption color="onGlassMuted" numberOfLines={2}>
            Tel qu’il apparaît sur le relevé
          </Caption>
        </YStack>
        <GlassAmountInput
          value={form.amount}
          onChangeText={form.setAmount}
          accessibilityLabel="Montant débité, en euros"
          testID="unknown-debit.amount"
        />
      </GlassCard>
    </Hero>
  );
}
