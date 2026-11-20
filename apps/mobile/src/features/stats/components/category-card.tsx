import { router } from 'expo-router';
import { YStack } from 'tamagui';
import type { CategoryCost } from '@/db/repositories/stats';
import { ActionButton } from '@/ui/controls/action-button';
import { Card } from '@/ui/surfaces/card';
import { Body, CardTitle } from '@/ui/text/typography';
import { CategoryBars } from './category-bars';

export function CategoryCard({ rows, totalCents }: { rows: CategoryCost[]; totalCents: number }) {
  return (
    <Card lift gap="3">
      <CardTitle>Répartition par catégorie</CardTitle>
      {rows.length === 0 ? (
        <YStack gap="3" items="flex-start">
          <Body color="colorMuted">Les abonnements actifs apparaîtront ici, regroupés par catégorie.</Body>
          <ActionButton label="Ajouter un abonnement" variant="outline" onPress={() => router.push('/subscriptions/new')} />
        </YStack>
      ) : (
        <CategoryBars rows={rows} total={totalCents} />
      )}
    </Card>
  );
}
