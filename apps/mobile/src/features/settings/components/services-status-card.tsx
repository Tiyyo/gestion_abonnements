import { todayIn } from '@abonnements/core';
import { router } from 'expo-router';
import { BellRing, Landmark, ListChecks, Sparkles } from 'lucide-react-native';
import { readBalancesConfig, readTransactionsConfig } from '@/config/function-config';
import { ConsentExpiredError } from '@/features/balances/consent-expired-error';
import { useBalances } from '@/features/balances/hooks/use-balances';
import { aiSuggestionStatus, reconcileStatus, remindersStatus, revolutStatus } from '@/features/settings/service-status';
import { dateOfTimestamp } from '@/lib/dates';
import { Caption } from '@/ui/text/typography';
import { GlassCard } from '@/ui/surfaces/glass-card';
import { ServiceLine } from './service-line';

type ServicesStatusCardProps = {
  remindersOn: boolean;
  notificationsAllowed: boolean | null;
  enrichIncluded: boolean;
  aiOn: boolean;
  reconcileOn: boolean;
  syncedThrough: string | null;
};

export function ServicesStatusCard(props: ServicesStatusCardProps) {
  const { remindersOn, notificationsAllowed, enrichIncluded, aiOn, reconcileOn, syncedThrough } = props;
  const balances = useBalances();
  const consentUntil = balances.data ? dateOfTimestamp(balances.data.consentValidUntil) : undefined;
  const expired = balances.error instanceof ConsentExpiredError;
  return (
    <GlassCard gap="2">
      <Caption color="onGlassMuted" accessibilityRole="header">
        État des services
      </Caption>
      {readBalancesConfig() ? (
        <ServiceLine
          icon={Landmark}
          label="Revolut"
          {...revolutStatus(expired ? undefined : consentUntil, expired, todayIn())}
          onPress={() => router.push('/consent')}
        />
      ) : null}
      {readTransactionsConfig() ? (
        <ServiceLine icon={ListChecks} label="Rapprochement" {...reconcileStatus(true, reconcileOn, syncedThrough)} />
      ) : null}
      <ServiceLine icon={BellRing} label="Rappels" {...remindersStatus(remindersOn, notificationsAllowed)} />
      <ServiceLine icon={Sparkles} label="Suggestion IA" {...aiSuggestionStatus(enrichIncluded, aiOn)} />
    </GlassCard>
  );
}
