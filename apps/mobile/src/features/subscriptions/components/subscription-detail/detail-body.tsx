import { YStack } from 'tamagui';
import { noticeKind } from '@/features/subscriptions/detail-hero';
import type { SubscriptionDetail } from '@/features/subscriptions/load-subscription-detail';
import { HERO_OVERLAP } from '@/theme/layout';
import { DetailHistory } from './detail-history';
import { DetailInfoCard } from './detail-info-card';
import { PriceHistoryCard } from './price-history-card';
import { StatusNotice } from './status-notice';

/** Cartes de la fiche : la première remonte sur le dégradé de l'en-tête (le bandeau d'alerte s'il y en a un, sinon les détails). */
export function DetailBody({ detail }: { detail: SubscriptionDetail }) {
  const { row, settings, history, priceHistory, provisionedCents, trialRisk, today } = detail;
  return (
    <YStack px="4" gap="4" mt={-HERO_OVERLAP}>
      <StatusNotice row={row} trialRisk={trialRisk} today={today} />
      <DetailInfoCard row={row} settings={settings} provisionedCents={provisionedCents} lift={noticeKind(row) === null} />
      <PriceHistoryCard row={row} priceHistory={priceHistory} />
      <DetailHistory history={history} />
    </YStack>
  );
}
